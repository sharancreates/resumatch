import os
import re
import uuid
import json
import logging
import requests
import threading
from io import BytesIO
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Header
from fastapi.responses import StreamingResponse, RedirectResponse
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models import User, Resume, ResumeVersion, JobDescription, Analysis, Membership, UsageLog, AuditLog, Organization
from utils.pdf_parser import parse_pdf
from utils.docx_parser import parse_docx
from utils.resume_parser import parse_resume_structure
from utils.db import get_db
from utils.auth_helper import get_current_user, get_current_user_optional, get_tenant_context_optional, TenantContext
from utils.storage import upload_file, download_file, generate_presigned_url, is_cloud_storage_configured, LOCAL_UPLOAD_DIR
from utils.limiter import limiter

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

logger = logging.getLogger(__name__)

analyze_router = APIRouter(prefix="/api", tags=["analyze"])

# In-memory tracking for anonymous student free scans and viral scorecards
_public_scan_lock = threading.Lock()
_public_scan_counts: dict[str, int] = {}
_scorecards: dict[str, dict] = {}

PUBLIC_FREE_SCAN_LIMIT = 3


def reset_public_scan_limits():
    """Testing helper to clear public scan quotas and scorecards."""
    with _public_scan_lock:
        _public_scan_counts.clear()
        _scorecards.clear()


def get_client_ip(request: Request, client_id: str | None = None) -> str:
    if client_id and client_id.strip():
        return f"client:{client_id.strip()}"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "anonymous_visitor"


class PublicAnalyzeRequest(BaseModel):
    resume: str
    job: str
    client_id: str | None = None


class AnalyzeRequest(BaseModel):
    resume: str
    job: str
    file_url: str | None = None


@analyze_router.post('/analyze/public')
@limiter.limit("15/minute")
async def analyze_public_endpoint(request: Request, req: PublicAnalyzeRequest):
    """
    Frictionless public resume scan endpoint for freshers.
    Zero sign-up required; tracks client IP/session with a 3-free-scan limit.
    """
    resume_text = req.resume.strip() if req.resume else ""
    job_text = req.job.strip() if req.job else ""

    if not resume_text or not job_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both resume text and target job description are required."
        )

    if len(resume_text) > 20000 or len(job_text) > 20000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input text exceeds maximum allowed length of 20,000 characters."
        )

    client_key = get_client_ip(request, req.client_id)

    with _public_scan_lock:
        current_count = _public_scan_counts.get(client_key, 0)
        if current_count >= PUBLIC_FREE_SCAN_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="You have used all 3 free scans. Sign in or grab a Sprint Pass for unlimited scans!"
            )
        _public_scan_counts[client_key] = current_count + 1
        remaining_scans = max(0, PUBLIC_FREE_SCAN_LIMIT - _public_scan_counts[client_key])

    # Offload heavy ML scoring and fresher audit to worker thread
    from services.ai_engine import hybrid_match_score
    from utils.resume_parser import parse_resume_structure
    from services.fresher_auditor import run_fresher_audit

    final_score, missing_keywords, lexical_score, semantic_score = await run_in_threadpool(
        hybrid_match_score, resume_text, job_text
    )

    structure = await run_in_threadpool(parse_resume_structure, resume_text)
    fresher_audit = await run_in_threadpool(run_fresher_audit, resume_text, structure)

    # Generate privacy-safe scorecard (never stores raw resume PII)
    scorecard_id = f"sc_{uuid.uuid4().hex[:12]}"
    with _public_scan_lock:
        _scorecards[scorecard_id] = {
            "id": scorecard_id,
            "score": final_score,
            "fresher_score": fresher_audit["fresher_score"],
            "readiness_verdict": fresher_audit["readiness_verdict"],
            "lexical_score": lexical_score,
            "semantic_score": semantic_score,
            "top_missing_skills": missing_keywords[:3],
            "critical_fixes": fresher_audit["critical_fixes"][:2],
            "all_missing_count": len(missing_keywords),
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    return {
        "status": "success",
        "data": {
            "scorecard_id": scorecard_id,
            "score": final_score,
            "fresher_audit": {
                "fresher_score": fresher_audit["fresher_score"],
                "readiness_verdict": fresher_audit["readiness_verdict"],
                "critical_fixes": fresher_audit["critical_fixes"][:2],
                "quick_wins": fresher_audit["quick_wins"][:2]
            },
            "breakdown": {
                "lexical": lexical_score,
                "semantic": semantic_score
            },
            "top_missing_skills": missing_keywords[:3],
            "all_missing_count": len(missing_keywords),
            "scans_remaining": remaining_scans
        }
    }


@analyze_router.get('/scorecards/{scorecard_id}')
def get_scorecard_endpoint(scorecard_id: str):
    """
    Public scorecard metadata endpoint for social sharing (WhatsApp / LinkedIn).
    DPDP compliant: Returns anonymized score and skill tags only.
    """
    with _public_scan_lock:
        card = _scorecards.get(scorecard_id)
    if not card:
        raise HTTPException(status_code=404, detail="Scorecard not found or expired.")
    return {
        "status": "success",
        "scorecard": card
    }

@analyze_router.post('/analyze')
@limiter.limit("20/minute")
async def analyze_endpoint(
    request: Request,
    req: AnalyzeRequest,
    tenant: TenantContext = Depends(get_tenant_context_optional),
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        resume_text = req.resume
        job_text = req.job

        if not resume_text or not job_text:
            raise HTTPException(status_code=400, detail="Resume and Job description are required.")

        if len(resume_text) > 20000 or len(job_text) > 20000: 
            raise HTTPException(status_code=400, detail="Input too long. Max 20,000 characters.")

        # Calculate scores offloaded from ASGI loop to threadpool
        from services.ai_engine import hybrid_match_score
        final_score, missing_keywords, lexical_score, semantic_score = await run_in_threadpool(
            hybrid_match_score, resume_text, job_text
        )

        # Parse resume structure offloaded to threadpool
        structure = await run_in_threadpool(parse_resume_structure, resume_text)

        # Run fresher-specific diagnostics offloaded to threadpool
        from services.fresher_auditor import run_fresher_audit
        fresher_audit = await run_in_threadpool(run_fresher_audit, resume_text, structure)

        # Generate placeholders for mock AI suggestions
        skills_gap = {
            "missing": missing_keywords,
            "matched": [s for s in ["Python", "React", "SQL"] if s.lower() in resume_text.lower()]
        }
        recommendations = [
            f"Add hands-on achievements incorporating missing skills: {', '.join(missing_keywords[:3])}."
        ]

        analysis_id = None
        if user:
            try:
                org_id = tenant.organization_id

                # 1. Fetch or create user's resume container scoped to organization if present
                if org_id:
                    resume = db.query(Resume).filter(
                        Resume.user_id == user.id,
                        Resume.organization_id == org_id,
                        Resume.is_archived == False
                    ).first()
                else:
                    resume = db.query(Resume).filter(
                        Resume.user_id == user.id,
                        Resume.is_archived == False
                    ).first()

                if not resume:
                    resume = Resume(
                        id=str(uuid.uuid4()),
                        user_id=user.id,
                        organization_id=org_id,
                        title="My Default Resume"
                    )
                    db.add(resume)
                    db.flush()
                elif org_id and not resume.organization_id:
                    resume.organization_id = org_id
                    db.flush()

                # Enforce free tier scan limit (10 scans)
                if not user.is_premium:
                    scan_count = db.query(Analysis).filter(Analysis.resume_id == resume.id).count()
                    if scan_count >= 10:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN, 
                            detail="Free tier scan limit (10 scans) reached. Please upgrade to Premium."
                        )

                # 2. Add a new version of the resume
                version_count = db.query(ResumeVersion).filter(ResumeVersion.resume_id == resume.id).count()
                resume_version = ResumeVersion(
                    id=str(uuid.uuid4()),
                    resume_id=resume.id,
                    version=version_count + 1,
                    file_url=req.file_url or "database-direct",
                    resume_text=resume_text,
                    parsed_json=structure
                )
                db.add(resume_version)
                db.flush()

                # 3. Create job description logs
                job_desc = JobDescription(
                    id=str(uuid.uuid4()),
                    organization_id=org_id,
                    title="Target Scanned Job",
                    job_text=job_text,
                    tags=[]
                )
                db.add(job_desc)
                db.flush()

                # 4. Save analysis record
                analysis = Analysis(
                    id=str(uuid.uuid4()),
                    resume_id=resume.id,
                    resume_version_id=resume_version.id,
                    job_description_id=job_desc.id,
                    score=final_score,
                    lexical_score=lexical_score,
                    semantic_score=semantic_score,
                    missing_keywords=missing_keywords,
                    skills_gap=skills_gap,
                    recommendations=recommendations
                )
                db.add(analysis)

                # 5. Record UsageLog for multi-tenant scan accounting
                usage_log = UsageLog(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    organization_id=org_id,
                    endpoint="/api/analyze",
                    scans_used=1
                )
                db.add(usage_log)

                db.commit()
                analysis_id = analysis.id
            except HTTPException:
                raise
            except Exception as db_err:
                db.rollback()
                logger.error(f"Failed to save analysis to DB: {str(db_err)}")
                # Continue returning scores even if save fails (resilient)

        return {
            "status": "success",
            "data": {
                "id": analysis_id,
                "score": final_score,
                "missing": missing_keywords,
                "breakdown": {
                    "lexical": lexical_score,
                    "semantic": semantic_score
                },
                "structure": structure,
                "fresher_audit": fresher_audit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal processing error.")

@analyze_router.get('/history')
def get_history(
    organization_id: str | None = None,
    x_organization_id: str | None = Header(None, alias="X-Organization-Id"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        target_org_id = organization_id or x_organization_id
        if target_org_id:
            membership = db.query(Membership).filter(
                Membership.organization_id == target_org_id,
                Membership.user_id == user.id
            ).first()
            if not membership:
                raise HTTPException(status_code=403, detail="Forbidden. Not a member of this organization.")

            resumes = db.query(Resume).filter(
                Resume.organization_id == target_org_id,
                Resume.is_archived == False
            ).all()
        else:
            resumes = db.query(Resume).filter(
                Resume.user_id == user.id,
                Resume.is_archived == False
            ).all()

        resume_ids = [r.id for r in resumes]
        if not resume_ids:
            return {"status": "success", "data": []}

        analyses = db.query(Analysis).filter(Analysis.resume_id.in_(resume_ids)).order_by(Analysis.created_at.desc()).all()
        
        # Format results matching react client expectation
        history_list = []
        for a in analyses:
            # Query associated text details
            version = db.query(ResumeVersion).filter(ResumeVersion.id == a.resume_version_id).first()
            job = db.query(JobDescription).filter(JobDescription.id == a.job_description_id).first()
            
            history_list.append({
                "id": a.id,
                "user_id": a.resume.user_id if a.resume else user.id,
                "resume_text": version.resume_text if version else "",
                "job_description": job.job_text if job else "",
                "score": a.score,
                "lexical_score": a.lexical_score,
                "semantic_score": a.semantic_score,
                "missing_keywords": json.dumps(a.missing_keywords) if isinstance(a.missing_keywords, (list, dict)) else str(a.missing_keywords),
                "resume_structure": json.dumps(version.parsed_json if version and version.parsed_json else {}),
                "created_at": a.created_at.isoformat() if a.created_at else None
            })
            
        return {
            "status": "success",
            "data": history_list
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fetch History Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch history.")

@analyze_router.delete('/history/{analysis_id}')
def delete_history_item(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found.")

        resume = db.query(Resume).filter(Resume.id == analysis.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Associated resume record not found.")

        is_owner = (resume.user_id == user.id)
        is_org_admin = False
        if resume.organization_id:
            membership = db.query(Membership).filter(
                Membership.organization_id == resume.organization_id,
                Membership.user_id == user.id,
                Membership.role.in_(["OWNER", "ADMIN"])
            ).first()
            if membership:
                is_org_admin = True

        if not (is_owner or is_org_admin):
            raise HTTPException(status_code=403, detail="Forbidden. You do not have permission to delete this analysis.")

        db.delete(analysis)
        db.commit()
        return {
            "status": "success",
            "message": "Analysis history item deleted."
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete History Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete history item.")

@analyze_router.post('/parse-pdf')
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith('.pdf') or filename_lower.endswith('.docx')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or DOCX file.")

    try:
        content = await file.read()
        header = content[:4]
        stream = BytesIO(content)

        if filename_lower.endswith('.pdf'):
            if not header.startswith(b'%PDF'):
                raise HTTPException(status_code=400, detail="Invalid file signature. Uploaded file is not a valid PDF.")
            text = await run_in_threadpool(parse_pdf, stream)
            content_type = file.content_type or "application/pdf"
        else:
            if not header.startswith(b'PK\x03\x04'):
                raise HTTPException(status_code=400, detail="Invalid file signature. Uploaded file is not a valid DOCX document.")
            text = await run_in_threadpool(parse_docx, stream)
            content_type = file.content_type or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
        file_url = await run_in_threadpool(upload_file, content, file.filename, content_type)
        return {"status": "success", "text": text, "file_url": file_url}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"File Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse file. Document may be corrupted.")

@analyze_router.post('/resumes/upload')
async def upload_resume_file(
    file: UploadFile = File(...),
    title: str = Form("Uploaded Resume"),
    tenant: TenantContext = Depends(get_tenant_context_optional),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith('.pdf') or filename_lower.endswith('.docx')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or DOCX file.")

    try:
        content = await file.read()
        header = content[:4]
        stream = BytesIO(content)

        if filename_lower.endswith('.pdf'):
            if not header.startswith(b'%PDF'):
                raise HTTPException(status_code=400, detail="Invalid file signature. Uploaded file is not a valid PDF.")
            text = await run_in_threadpool(parse_pdf, stream)
            content_type = file.content_type or "application/pdf"
        else:
            if not header.startswith(b'PK\x03\x04'):
                raise HTTPException(status_code=400, detail="Invalid file signature. Uploaded file is not a valid DOCX document.")
            text = await run_in_threadpool(parse_docx, stream)
            content_type = file.content_type or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        structure = await run_in_threadpool(parse_resume_structure, text)
        file_url = await run_in_threadpool(upload_file, content, file.filename, content_type)

        org_id = tenant.organization_id

        # Find or create user's resume container
        if org_id:
            resume = db.query(Resume).filter(
                Resume.user_id == user.id,
                Resume.organization_id == org_id,
                Resume.is_archived == False
            ).first()
        else:
            resume = db.query(Resume).filter(
                Resume.user_id == user.id,
                Resume.is_archived == False
            ).first()

        if not resume:
            resume = Resume(
                id=str(uuid.uuid4()),
                user_id=user.id,
                organization_id=org_id,
                title=title
            )
            db.add(resume)
            db.flush()

        version_count = db.query(ResumeVersion).filter(ResumeVersion.resume_id == resume.id).count()
        resume_version = ResumeVersion(
            id=str(uuid.uuid4()),
            resume_id=resume.id,
            version=version_count + 1,
            file_url=file_url,
            resume_text=text,
            parsed_json=structure
        )
        db.add(resume_version)
        db.commit()

        return {
            "status": "success",
            "data": {
                "resume_id": resume.id,
                "version_id": resume_version.id,
                "version": resume_version.version,
                "title": resume.title,
                "file_url": file_url,
                "structure": structure,
                "text_length": len(text)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Resume Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload and process resume.")

@analyze_router.get('/resumes/{resume_id}/versions/{version_id}/download')
def download_resume_version(
    resume_id: str,
    version_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume record not found.")

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
            raise HTTPException(status_code=403, detail="Forbidden. You do not have access to this resume.")

        version = db.query(ResumeVersion).filter(
            ResumeVersion.id == version_id,
            ResumeVersion.resume_id == resume_id
        ).first()
        if not version:
            raise HTTPException(status_code=404, detail="Resume version not found.")

        if not version.file_url or version.file_url == "database-direct":
            return StreamingResponse(
                BytesIO(version.resume_text.encode('utf-8')),
                media_type="text/plain",
                headers={"Content-Disposition": f"attachment; filename=resume_{resume_id}_v{version.version}.txt"}
            )

        if is_cloud_storage_configured() and not version.file_url.startswith("/api/uploads/"):
            presigned = generate_presigned_url(version.file_url)
            return RedirectResponse(url=presigned, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

        file_bytes = download_file(version.file_url)
        ext = os.path.splitext(version.file_url)[1] or ".pdf"
        media_type = "application/pdf" if ext.lower() == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        return StreamingResponse(
            BytesIO(file_bytes),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename=resume_{resume_id}_v{version.version}{ext}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume Download Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download resume version.")

@analyze_router.get('/uploads/{filename}')
def serve_uploaded_file(filename: str):
    # Defense against directory traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid file path.")

    local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="File not found.")

    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        media_type = "application/octet-stream"

    with open(local_path, "rb") as f:
        data = f.read()

    return StreamingResponse(
        BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

@analyze_router.get('/analyze/{analysis_id}/suggestions')
def get_bullet_suggestions(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found")

        # Double check owner access or organization membership access
        resume = db.query(Resume).filter(Resume.id == analysis.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Associated resume record not found")

        is_owner = (resume.user_id == user.id)
        is_member = False
        if resume.organization_id:
            mem = db.query(Membership).filter(
                Membership.organization_id == resume.organization_id,
                Membership.user_id == user.id
            ).first()
            if mem:
                is_member = True

        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="Forbidden.")

        if not user.is_premium:
            return {
                "status": "locked",
                "message": "Upgrade to Premium to unlock AI suggestions."
            }

        # Check Gemini Key
        gemini_key = os.environ.get('GEMINI_API_KEY')
        if gemini_key:
            version = db.query(ResumeVersion).filter(ResumeVersion.id == analysis.resume_version_id).first()
            job = db.query(JobDescription).filter(JobDescription.id == analysis.job_description_id).first()
            
            prompt = f"""
            You are an expert resume writer and recruiter. Analyze the following resume and job description.
            Resume Text: {version.resume_text[:4000] if version else ""}
            Job Description: {job.job_text[:4000] if job else ""}
            
            Generate 3 concrete, high-impact resume bullet point rewrite suggestions.
            Format your response as a simple JSON array of strings, for example:
            [
              "Rewrite your experience with Python to: 'Designed and deployed 5+ scalable microservices using Python and Flask, reducing database latency by 20%.'",
              "Add details about React: 'Collaborated with UI teams to construct responsive frontend views in React, increasing user engagement metrics.'"
            ]
            Respond with ONLY the JSON array. Do not include any explanation or markdown formatting.
            """
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }
                res = requests.post(url, headers=headers, json=payload, timeout=10)
                if res.status_code == 200:
                    resp_json = res.json()
                    candidate_text = resp_json['candidates'][0]['content']['parts'][0]['text'].strip()
                    if candidate_text.startswith("```"):
                        candidate_text = re.sub(r'^```[a-zA-Z]*\n', '', candidate_text)
                        candidate_text = re.sub(r'\n```$', '', candidate_text)
                    try:
                        suggestions = json.loads(candidate_text)
                        return {"status": "success", "suggestions": suggestions}
                    except Exception:
                        lines = [line.strip("-* ").strip() for line in candidate_text.split("\n") if line.strip()]
                        return {"status": "success", "suggestions": lines[:3]}
            except Exception as e:
                logger.error(f"Gemini API invocation failed: {str(e)}")

        # Fallback offline generator
        missing_list = analysis.missing_keywords
        suggestions = [
            "Include more quantifiable achievements: e.g. instead of 'Responsible for React development', write 'Engineered 12+ reusable React components, saving 15 hours of design iterations'.",
            "Action verbs matter: start your project descriptions with strong verbs like 'Spearheaded', 'Optimized', 'Architected', or 'Leveraged'."
        ]
        if missing_list:
            skills_str = ", ".join(missing_list[:3])
            suggestions.append(f"Demonstrate core expertise in job requirements: add bullet points highlighting hands-on project experience with: {skills_str}.")
        else:
            suggestions.append("Align resume formatting: ensure your technical skills section is sorted by relevance to the targeting job profile.")
            
        return {"status": "success", "suggestions": suggestions}
    except Exception as e:
        logger.error(f"Suggestions Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch suggestions.")

@analyze_router.get('/history/{analysis_id}/export')
def export_report_endpoint(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found.")

        # Double check owner access
        resume = db.query(Resume).filter(Resume.id == analysis.resume_id, Resume.user_id == user.id).first()
        if not resume:
            raise HTTPException(status_code=403, detail="Forbidden.")
            
        version = db.query(ResumeVersion).filter(ResumeVersion.id == analysis.resume_version_id).first()
        job = db.query(JobDescription).filter(JobDescription.id == analysis.job_description_id).first()
            
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )
        story = []
        styles = getSampleStyleSheet()
        
        primary_color = colors.HexColor("#312E81")
        secondary_color = colors.HexColor("#4F46E5")
        text_color = colors.HexColor("#1F2937")
        
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            textColor=primary_color,
            spaceAfter=15
        )
        
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor("#4B5563"),
            spaceAfter=25
        )
        
        h2_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=secondary_color,
            spaceBefore=15,
            spaceAfter=10
        )
        
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10.5,
            textColor=text_color,
            leading=14,
            spaceAfter=8
        )
        
        story.append(Paragraph("ResuMatch ATS Match Report", title_style))
        created_str = analysis.created_at.strftime("%B %d, %Y at %I:%M %p")
        story.append(Paragraph(f"Generated on {created_str} | Match Analysis #{analysis.id}", subtitle_style))
        
        score_data = [
            [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Score %</b>", body_style)],
            [Paragraph("Overall Match Score", body_style), Paragraph(f"<b>{analysis.score}%</b>", body_style)],
            [Paragraph("Lexical Matching", body_style), Paragraph(f"{analysis.lexical_score}%", body_style)],
            [Paragraph("Semantic Relevance", body_style), Paragraph(f"{analysis.semantic_score}%", body_style)]
        ]
        
        score_table = Table(score_data, colWidths=[200, 100])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EEF2F6")),
            ('TEXTCOLOR', (0,0), (-1,0), primary_color),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F9FAFB")]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ]))
        
        story.append(Paragraph("Score Breakdown", h2_style))
        story.append(score_table)
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("Missing Skills & Keywords", h2_style))
        missing = analysis.missing_keywords
            
        if missing:
            missing_text = "The scan detected the following skills or entities in the target job description that are missing or underrepresented in your resume:<br/><br/>"
            missing_text += ", ".join([f"<b>{m}</b>" for m in missing])
            story.append(Paragraph(missing_text, body_style))
        else:
            story.append(Paragraph("Excellent! The analysis did not identify any major missing skills or technologies compared to the job description.", body_style))
            
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("Actionable Optimization Steps", h2_style))
        recommendations = [
            "1. Incorporate the missing keywords highlighted above in your experience descriptions naturally.",
            "2. Quantify achievements (e.g. use percentage increases, dollar amounts, or team size metrics).",
            "3. Ensure the structural sections (Experience, Education, Skills) are clearly separated by headings."
        ]
        for rec in recommendations:
            story.append(Paragraph(rec, body_style))
            
        doc.build(story)
        buffer.seek(0)
        
        # Yield streaming response
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=resumatch_report_{analysis_id}.pdf"}
        )
    except Exception as e:
        logger.error(f"PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF report.")

@analyze_router.get('/health')
def health_check():
    from services.ai_engine import is_model_loaded
    model_status = "loaded" if is_model_loaded() else "unavailable"
    return {
        "status": "alive",
        "message": "ResuMatch Backend Ready",
        "semantic_model": model_status,
    }