import json
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def build_ats_report_pdf(analysis, resume_version=None, job_description=None, candidate_name: str | None = None) -> bytes:
    """
    Constructs a professional ATS evaluation summary report PDF using ReportLab
    and returns the binary PDF bytes.
    """
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
    created_at = getattr(analysis, 'created_at', None)
    if created_at and hasattr(created_at, 'strftime'):
        created_str = created_at.strftime("%B %d, %Y at %I:%M %p")
    else:
        created_str = str(created_at or "Recent")

    header_info = f"Generated on {created_str} | Match Analysis #{str(getattr(analysis, 'id', ''))[:8]}"
    if candidate_name:
        header_info += f" | Candidate: {candidate_name}"
    story.append(Paragraph(header_info, subtitle_style))

    score_val = getattr(analysis, 'score', 0)
    lexical_val = getattr(analysis, 'lexical_score', 0)
    semantic_val = getattr(analysis, 'semantic_score', 0)

    score_data = [
        [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Score %</b>", body_style)],
        [Paragraph("Overall Match Score", body_style), Paragraph(f"<b>{score_val}%</b>", body_style)],
        [Paragraph("Lexical Matching", body_style), Paragraph(f"{lexical_val}%", body_style)],
        [Paragraph("Semantic Relevance", body_style), Paragraph(f"{semantic_val}%", body_style)]
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
    missing = getattr(analysis, 'missing_keywords', [])
    if isinstance(missing, str):
        try:
            missing = json.loads(missing)
        except Exception:
            missing = [missing]
    if missing:
        missing_text = "The scan detected the following skills or entities in the target job description that are missing or underrepresented in your resume:<br/><br/>"
        missing_text += ", ".join([f"<b>{m}</b>" for m in missing])
        story.append(Paragraph(missing_text, body_style))
    else:
        story.append(Paragraph("Excellent! The analysis did not identify any major missing skills or technologies compared to the job description.", body_style))

    story.append(Spacer(1, 15))

    story.append(Paragraph("Actionable Optimization Steps", h2_style))
    recs = getattr(analysis, 'recommendations', None)
    if not recs or not isinstance(recs, list):
        recs = [
            "1. Incorporate the missing keywords highlighted above in your experience descriptions naturally.",
            "2. Quantify achievements (e.g. use percentage increases, dollar amounts, or team size metrics).",
            "3. Ensure the structural sections (Experience, Education, Skills) are clearly separated by headings."
        ]
    for rec in recs:
        story.append(Paragraph(str(rec), body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
