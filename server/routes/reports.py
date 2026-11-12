import uuid
from io import BytesIO
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session

from models import User, Resume, ResumeVersion, JobDescription, Analysis, Membership, Organization, Report
from utils.db import get_db
from utils.auth_helper import get_current_user, get_tenant_context_optional, TenantContext
from utils.storage import upload_file, download_file, generate_presigned_url, delete_file, is_cloud_storage_configured
from services.report_generator import build_ats_report_pdf

reports_router = APIRouter(prefix="/api", tags=["reports"])

@reports_router.post('/reports/generate/{analysis_id}')
def generate_and_save_report(
    analysis_id: str,
    tenant: TenantContext = Depends(get_tenant_context_optional),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a PDF evaluation report for the specified analysis, stores the PDF
    bytes in object storage, and creates a Report record in the database.
    """
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found.")

        resume = db.query(Resume).filter(Resume.id == analysis.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Associated resume record not found.")

        # Tenancy access check
        is_owner = (resume.user_id == user.id)
        is_member = False
        if resume.organization_id:
            membership = db.query(Membership).filter(
                Membership.organization_id == resume.organization_id,
                Membership.user_id == user.id
            ).first()
            if membership:
                is_member = True

        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Forbidden. You do not have access to this analysis.")

        version = db.query(ResumeVersion).filter(ResumeVersion.id == analysis.resume_version_id).first()
        job = db.query(JobDescription).filter(JobDescription.id == analysis.job_description_id).first()

        # Build PDF
        pdf_bytes = build_ats_report_pdf(
            analysis=analysis,
            resume_version=version,
            job_description=job,
            candidate_name=user.name or (user.email.split('@')[0] if user.email else None)
        )

        # Upload PDF
        pdf_filename = f"report_{analysis_id}.pdf"
        pdf_url = upload_file(pdf_bytes, pdf_filename, "application/pdf")

        # Resolve organization_id
        org_id = resume.organization_id or tenant.organization_id
        if not org_id:
            # Fall back to user's first membership if available
            mem = db.query(Membership).filter(Membership.user_id == user.id).first()
            if mem:
                org_id = mem.organization_id

        if not org_id:
            # If user has no organization, ensure one exists for multi-tenant linkage
            default_org = Organization(
                id=str(uuid.uuid4()),
                name=f"{user.name or 'Personal'}'s Workspace",
                slug=f"org-{str(uuid.uuid4())[:8]}"
            )
            db.add(default_org)
            new_mem = Membership(
                id=str(uuid.uuid4()),
                organization_id=default_org.id,
                user_id=user.id,
                role="OWNER"
            )
            db.add(new_mem)
            db.flush()
            org_id = default_org.id

        # Create Report record
        report = Report(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            name=f"ATS Match Report - Score: {analysis.score}%",
            description=f"Evaluation report for analysis #{analysis.id[:8]}",
            analysis_ids=[analysis.id],
            pdf_url=pdf_url,
            created_at=datetime.now(timezone.utc)
        )
        db.add(report)
        db.commit()

        return {
            "status": "success",
            "message": "Report generated and persisted successfully.",
            "data": report.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@reports_router.get('/reports/{report_id}')
def get_report(report_id: str, db: Session = Depends(get_db)):
    """
    Public / Shareable endpoint retrieving report metadata and associated analysis details.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    # Fetch associated analysis summary if available
    analysis_details = []
    if report.analysis_ids and isinstance(report.analysis_ids, list):
        analyses = db.query(Analysis).filter(Analysis.id.in_(report.analysis_ids)).all()
        for a in analyses:
            analysis_details.append({
                "id": a.id,
                "score": a.score,
                "lexical_score": a.lexical_score,
                "semantic_score": a.semantic_score,
                "missing_keywords": a.missing_keywords,
                "created_at": a.created_at.isoformat() if a.created_at else None
            })

    presigned_download = generate_presigned_url(report.pdf_url)

    return {
        "status": "success",
        "data": {
            **report.to_dict(),
            "download_url": presigned_download,
            "analyses": analysis_details
        }
    }

@reports_router.get('/reports/{report_id}/download')
def download_report_pdf(report_id: str, db: Session = Depends(get_db)):
    """
    Downloads the persisted PDF report. Redirects to S3 presigned URL if cloud
    storage is active, or streams the file bytes from local uploads.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if not report.pdf_url:
        raise HTTPException(status_code=404, detail="No PDF document associated with this report.")

    if is_cloud_storage_configured() and not report.pdf_url.startswith("/api/uploads/"):
        presigned = generate_presigned_url(report.pdf_url)
        return RedirectResponse(url=presigned, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    try:
        file_bytes = download_file(report.pdf_url)
        return StreamingResponse(
            BytesIO(file_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=resumatch_report_{report.id[:8]}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download report PDF: {str(e)}")

@reports_router.get('/orgs/{org_id}/reports')
def list_org_reports(
    org_id: str,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all reports generated for the organization. Requires active membership.
    """
    membership = db.query(Membership).filter(
        Membership.organization_id == org_id,
        Membership.user_id == user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden. Not a member of this organization.")

    query = db.query(Report).filter(Report.organization_id == org_id).order_by(Report.created_at.desc())
    total = query.count()
    reports = query.offset(offset).limit(min(limit, 100)).all()

    return {
        "status": "success",
        "data": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "reports": [r.to_dict() for r in reports]
        }
    }

@reports_router.delete('/reports/{report_id}')
def delete_report(
    report_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a report record and underlying PDF file from storage.
    Restricted to organization OWNER or ADMIN.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    membership = db.query(Membership).filter(
        Membership.organization_id == report.organization_id,
        Membership.user_id == user.id,
        Membership.role.in_(["OWNER", "ADMIN"])
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden. Only organization owners or administrators can delete reports.")

    try:
        if report.pdf_url:
            delete_file(report.pdf_url)

        db.delete(report)
        db.commit()
        return {
            "status": "success",
            "message": "Report deleted successfully."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")
