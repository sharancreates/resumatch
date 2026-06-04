from flask import Blueprint, request, jsonify, g
from services.ai_engine import hybrid_match_score, is_model_loaded
from utils.pdf_parser import parse_pdf
from utils.docx_parser import parse_docx
from utils.auth_helper import get_current_user_optional, token_required
from models import db, ResumeAnalysis, User
import os
import re
import requests
from io import BytesIO
from flask import send_file
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from utils.limiter import limiter
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

analyze_bp = Blueprint('analyze', __name__)

@analyze_bp.route('/analyze', methods=['POST'])
@limiter.limit("15 per minute")
def analyze_endpoint():
    try:
        data = request.json or {}
        resume = data.get('resume', '')
        job = data.get('job', '')

        if not resume or not job:
            return jsonify({"error": "Resume and Job description are required."}), 400

        if len(resume) > 20000 or len(job) > 20000: 
            return jsonify({"error": "Input too long. Max 20,000 characters."}), 400

        final_score, missing_keywords, lexical_score, semantic_score = hybrid_match_score(resume, job)

        from utils.resume_parser import parse_resume_structure
        structure = parse_resume_structure(resume)

        # Check if user is logged in to save history
        user = get_current_user_optional()
        analysis_id = None
        if user:
            try:
                analysis = ResumeAnalysis(
                    user_id=user.id,
                    resume_text=resume,
                    job_description=job,
                    score=final_score,
                    lexical_score=lexical_score,
                    semantic_score=semantic_score,
                    missing_keywords=json.dumps(missing_keywords),
                    resume_structure=json.dumps(structure)
                )
                db.session.add(analysis)
                db.session.commit()
                analysis_id = analysis.id
            except Exception as db_err:
                db.session.rollback()
                logger.error(f"Failed to save analysis to DB: {str(db_err)}")
                # Do not fail the request if database save fails, still return the scores

        return jsonify({
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
        })
    except Exception as e:
        logger.error(f"Analysis Error: {str(e)}")
        # In production, never return str(e) to the client (security risk). Log it instead.
        return jsonify({"error": "Internal processing error."}), 500

@analyze_bp.route('/history', methods=['GET'])
@token_required
def get_history():
    try:
        analyses = ResumeAnalysis.query.filter_by(user_id=g.user.id).order_by(ResumeAnalysis.created_at.desc()).all()
        return jsonify({
            "status": "success",
            "data": [a.to_dict() for a in analyses]
        })
    except Exception as e:
        logger.error(f"Fetch History Error: {str(e)}")
        return jsonify({"error": "Failed to fetch history."}), 500

@analyze_bp.route('/history/<int:analysis_id>', methods=['DELETE'])
@token_required
def delete_history_item(analysis_id):
    try:
        analysis = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=g.user.id).first()
        if not analysis:
            return jsonify({"error": "Analysis record not found."}), 404
        
        db.session.delete(analysis)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Analysis history item deleted."
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete History Error: {str(e)}")
        return jsonify({"error": "Failed to delete history item."}), 500

@analyze_bp.route('/parse-pdf', methods=['POST'])
@limiter.limit("15 per minute")
def parse_pdf_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith('.pdf') or filename_lower.endswith('.docx')):
        return jsonify({"error": "Invalid file type. Please upload a PDF or DOCX file."}), 400

    try:
        header = file.stream.read(4)
        file.stream.seek(0)

        if filename_lower.endswith('.pdf'):
            if not header.startswith(b'%PDF'):
                return jsonify({"error": "Invalid file signature. Uploaded file is not a valid PDF."}), 400
            text = parse_pdf(file.stream)
        else:
            if not header.startswith(b'PK\x03\x04'):
                return jsonify({"error": "Invalid file signature. Uploaded file is not a valid DOCX document."}), 400
            text = parse_docx(file.stream)
        return jsonify({"status": "success", "text": text})
    except Exception as e:
        logger.error(f"File Parse Error: {str(e)}")
        return jsonify({"error": "Failed to parse file. Document may be corrupted."}), 500

@analyze_bp.route('/analyze/<int:analysis_id>/suggestions', methods=['GET'])
@token_required
def get_bullet_suggestions(analysis_id):
    try:
        user = User.query.get(g.user.id)
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        analysis = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=g.user.id).first()
        if not analysis:
            return jsonify({"error": "Analysis record not found"}), 404
            
        if not user.is_premium:
            return jsonify({
                "status": "locked",
                "message": "Upgrade to Premium to unlock AI suggestions."
            }), 403

        gemini_key = os.environ.get('GEMINI_API_KEY')
        if gemini_key:
            prompt = f"""
            You are an expert resume writer and recruiter. Analyze the following resume and job description.
            Resume Text: {analysis.resume_text[:4000]}
            Job Description: {analysis.job_description[:4000]}
            
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
                        return jsonify({"status": "success", "suggestions": suggestions})
                    except Exception:
                        lines = [line.strip("-* ").strip() for line in candidate_text.split("\n") if line.strip()]
                        return jsonify({"status": "success", "suggestions": lines[:3]})
            except Exception as e:
                logger.error(f"Gemini API invocation failed: {str(e)}")

        # Fallback offline generator
        try:
            missing_list = json.loads(analysis.missing_keywords)
        except Exception:
            missing_list = []
            
        suggestions = [
            "Include more quantifiable achievements: e.g. instead of 'Responsible for React development', write 'Engineered 12+ reusable React components, saving 15 hours of design iterations'.",
            "Action verbs matter: start your project descriptions with strong verbs like 'Spearheaded', 'Optimized', 'Architected', or 'Leveraged'."
        ]
        if missing_list:
            skills_str = ", ".join(missing_list[:3])
            suggestions.append(f"Demonstrate core expertise in job requirements: add bullet points highlighting hands-on project experience with: {skills_str}.")
        else:
            suggestions.append("Align resume formatting: ensure your technical skills section is sorted by relevance to the targeting job profile.")
            
        return jsonify({"status": "success", "suggestions": suggestions})
    except Exception as e:
        logger.error(f"Suggestions Error: {str(e)}")
        return jsonify({"error": "Failed to fetch suggestions."}), 500

@analyze_bp.route('/history/<int:analysis_id>/export', methods=['GET'])
@token_required
def export_report_endpoint(analysis_id):
    try:
        analysis = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=g.user.id).first()
        if not analysis:
            return jsonify({"error": "Analysis not found."}), 404
            
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
        try:
            missing = json.loads(analysis.missing_keywords)
        except Exception:
            missing = []
            
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
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"resumatch_report_{analysis_id}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        logger.error(f"PDF Export Error: {str(e)}")
        return jsonify({"error": "Failed to generate PDF report."}), 500

@analyze_bp.route('/health', methods=['GET'])
def health_check():
    model_status = "loaded" if is_model_loaded() else "unavailable"
    return jsonify({
        "status": "alive",
        "message": "ResuMatch Backend Ready",
        "semantic_model": model_status,
    })