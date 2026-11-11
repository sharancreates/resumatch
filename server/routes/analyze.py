import os
import re
import uuid
import json
import logging
import requests
from io import BytesIO
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models import User, Resume, ResumeVersion, JobDescription, Analysis, Membership
from services.ai_engine import hybrid_match_score, is_model_loaded
from utils.pdf_parser import parse_pdf
from utils.docx_parser import parse_docx
from utils.resume_parser import parse_resume_structure
from utils.db import get_db
from utils.auth_helper import get_current_user, get_current_user_optional

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

logger = logging.getLogger(__name__)

analyze_router = APIRouter(prefix="/api", tags=["analyze"])

class AnalyzeRequest(BaseModel):
    resume: str
    job: str

@analyze_router.post('/analyze')
def analyze_endpoint(req: AnalyzeRequest, user: User | None = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    try:
        resume_text = req.resume
        job_text = req.job

        if not resume_text or not job_text:
            raise HTTPException(status_code=400, detail="Resume and Job description are required.")

        if len(resume_text) > 20000 or len(job_text) > 20000: 
            raise HTTPException(status_code=400, detail="Input too long. Max 20,000 characters.")

        # Calculate scores
        final_score, missing_keywords, lexical_score, semantic_score = hybrid_match_score(resume_text, job_text)

        # Parse resume structure
        structure = parse_resume_structure(resume_text)

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
                # Find user's active membership
                membership = db.query(Membership).filter(Membership.user_id == user.id).first()
                org_id = membership.organization_id if membership else None

                # 1. Fetch or create user's default resume container
                resume = db.query(Resume).filter(Resume.user_id == user.id, Resume.is_archived == False).first()
                if not resume:
                    resume = Resume(
                        id=str(uuid.uuid4()),
                        user_id=user.id,
                        organization_id=org_id,
                        title="My Default Resume"
                    )
                    db.add(resume)
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
                    file_url="database-direct",
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
                db.commit()
                analysis_id = analysis.id
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
                "structure": structure
            }
        }
    except Exception as e:
        logger.error(f"Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal processing error.")

@analyze_router.get('/history')
def get_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Find user's resume container
        resume = db.query(Resume).filter(Resume.user_id == user.id, Resume.is_archived == False).first()
        if not resume:
            return {"status": "success", "data": []}

        analyses = db.query(Analysis).filter(Analysis.resume_id == resume.id).order_by(Analysis.created_at.desc()).all()
        
        # Format results matching react client expectation
        history_list = []
        for a in analyses:
            # Query associated text details
            version = db.query(ResumeVersion).filter(ResumeVersion.id == a.resume_version_id).first()
            job = db.query(JobDescription).filter(JobDescription.id == a.job_description_id).first()
            
            history_list.append({
                "id": a.id,
                "user_id": user.id,
                "resume_text": version.resume_text if version else "",
                "job_description": job.job_text if job else "",
                "score": a.score,
                "lexical_score": a.lexical_score,
                "semantic_score": a.semantic_score,
                "missing_keywords": json.dumps(a.missing_keywords),
                "resume_structure": json.dumps(version.parsed_json if version else {}),
                "created_at": a.created_at.isoformat() if a.created_at else None
            })
            
        return {
            "status": "success",
            "data": history_list
        }
    except Exception as e:
        logger.error(f"Fetch History Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch history.")

@analyze_router.delete('/history/{analysis_id}')
def delete_history_item(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Locate the user's resumes
        resume = db.query(Resume).filter(Resume.user_id == user.id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Analysis record not found.")

        analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.resume_id == resume.id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found.")
        
        db.delete(analysis)
        db.commit()
        return {
            "status": "success",
            "message": "Analysis history item deleted."
        }
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
            text = parse_pdf(stream)
        else:
            if not header.startswith(b'PK\x03\x04'):
                raise HTTPException(status_code=400, detail="Invalid file signature. Uploaded file is not a valid DOCX document.")
            text = parse_docx(stream)
        
        return {"status": "success", "text": text}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"File Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse file. Document may be corrupted.")

@analyze_router.get('/analyze/{analysis_id}/suggestions')
def get_bullet_suggestions(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found")

        # Double check owner access
        resume = db.query(Resume).filter(Resume.id == analysis.resume_id, Resume.user_id == user.id).first()
        if not resume:
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
    model_status = "loaded" if is_model_loaded() else "unavailable"
    return {
        "status": "alive",
        "message": "ResuMatch Backend Ready",
        "semantic_model": model_status,
    }