import html
import re
from io import BytesIO
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from utils.resume_parser import parse_resume_structure, parse_contact_details

TEMPLATES_CATALOG = [
    {
        "id": "classic_tech",
        "name": "Classic Tech",
        "recommended_for": "Software Engineering & Full-Stack",
        "description": "High-density, proven technical layout prioritizing grouped skills and project tech stacks with quantifiable results.",
        "accent_color": "#1E3A8A"
    },
    {
        "id": "modern_minimal",
        "name": "Modern Minimal",
        "recommended_for": "Frontend, Web & Startup Roles",
        "description": "Contemporary sans-serif typography with clean spacing and subtle horizontal rules.",
        "accent_color": "#2563EB"
    },
    {
        "id": "data_analytics",
        "name": "Data & Analytics",
        "recommended_for": "Data Science, Analytics & Machine Learning",
        "description": "Emphasizes quantitative tool mastery (Python, SQL, Tableau, PyTorch), dataset scale, and predictive metrics.",
        "accent_color": "#0F766E"
    },
    {
        "id": "campus_placement",
        "name": "Campus Placement Standard",
        "recommended_for": "Indian IIT / NIT / College Placement Drives",
        "description": "Strict single-page university hierarchy with academic credentials and CGPA/marks placed prominently first.",
        "accent_color": "#111827"
    }
]


def normalize_resume_data(resume_text: str, parsed_structure: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Transforms raw resume text or existing parsed structure into a uniform dictionary
    ready for multi-template rendering.
    """
    if not parsed_structure:
        parsed_structure = parse_resume_structure(resume_text)

    contact = parsed_structure.get("contact_details", {})
    sections = parsed_structure.get("sections", {})

    # 1. Candidate Name Extraction
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    candidate_name = "Candidate"
    if lines:
        first_line = lines[0]
        # Verify first line isn't an email, url, or header
        if (
            len(first_line) < 45
            and not re.search(r'[@\:\/\|]', first_line)
            and not any(h in first_line.lower() for h in ["resume", "curriculum", "education", "experience", "projects", "skills"])
        ):
            candidate_name = first_line

    # 2. Extract Projects
    projects_text = sections.get("projects", "")
    projects: List[Dict[str, Any]] = []
    
    if projects_text:
        proj_lines = [l.strip() for l in projects_text.split('\n') if l.strip()]
        current_title = ""
        current_stack = ""
        current_bullets = []

        for line in proj_lines:
            is_title = (
                not line.startswith(('-', '*', '•', '◦'))
                and (
                    ('|' in line and len(line) < 110)
                    or (line.endswith(':') and len(line) < 60)
                    or (len(line) < 60 and any(k in line.lower() for k in ["app", "system", "engine", "platform", "bot", "portal", "website", "detector", "model", "queue"]))
                )
            )

            if is_title:
                if current_title or current_bullets:
                    projects.append({
                        "title": current_title or "Project",
                        "stack": current_stack,
                        "bullets": current_bullets if current_bullets else [current_title]
                    })
                if '|' in line:
                    parts = line.split('|', 1)
                    current_title = parts[0].strip()
                    current_stack = parts[1].strip()
                else:
                    current_title = line.rstrip(':').strip()
                    current_stack = ""
                current_bullets = []
            else:
                bullet_clean = re.sub(r'^[\s\-\*•◦]+', '', line).strip()
                if bullet_clean:
                    current_bullets.append(bullet_clean)

        if current_title or current_bullets:
            projects.append({
                "title": current_title or "Project",
                "stack": current_stack,
                "bullets": current_bullets if current_bullets else [current_title]
            })

    # If no projects were parsed via section, create a default entry
    if not projects and projects_text:
        projects.append({
            "title": "Technical Projects",
            "stack": "",
            "bullets": [re.sub(r'^[\s\-\*•◦]+', '', l).strip() for l in projects_text.split('\n') if l.strip()]
        })

    # 3. Extract Education
    edu_text = sections.get("education", "")
    edu_lines = [re.sub(r'^[\s\-\*•◦]+', '', l).strip() for l in edu_text.split('\n') if l.strip()]

    # 4. Extract Skills
    skills_text = sections.get("skills", "")
    skills_lines = [re.sub(r'^[\s\-\*•◦]+', '', l).strip() for l in skills_text.split('\n') if l.strip()]

    # 5. Extract Coursework
    cw_text = sections.get("coursework", "")
    cw_lines = [re.sub(r'^[\s\-\*•◦]+', '', l).strip() for l in cw_text.split('\n') if l.strip()]

    # 6. Extract Certifications
    cert_text = sections.get("certifications", "")
    cert_lines = [re.sub(r'^[\s\-\*•◦]+', '', l).strip() for l in cert_text.split('\n') if l.strip()]

    return {
        "candidate_name": candidate_name,
        "contact": contact,
        "education": edu_lines,
        "skills": skills_lines,
        "projects": projects,
        "coursework": cw_lines,
        "certifications": cert_lines,
        "raw_sections": sections
    }


def _safe_escape(text: str) -> str:
    """Escapes HTML entities for ReportLab XML rendering."""
    return html.escape(str(text or "")).replace('&amp;', '&')


def generate_resume_pdf(resume_data: Dict[str, Any], template_id: str = "classic_tech") -> bytes:
    """
    Renders an ATS-safe single-page resume into a PDF byte stream using ReportLab.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Template Color Themes
    theme_colors = {
        "classic_tech": colors.HexColor("#1E3A8A"),      # Navy
        "modern_minimal": colors.HexColor("#2563EB"),    # Modern Blue
        "data_analytics": colors.HexColor("#0F766E"),    # Teal
        "campus_placement": colors.HexColor("#111827")   # Charcoal
    }
    accent = theme_colors.get(template_id, colors.HexColor("#1E3A8A"))
    text_color = colors.HexColor("#1F2937")

    # Typography styles
    name_style = ParagraphStyle(
        'DocName',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=22,
        textColor=accent,
        alignment=1 if template_id in ["classic_tech", "campus_placement"] else 0,
        spaceAfter=4
    )

    contact_style = ParagraphStyle(
        'DocContact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#4B5563"),
        alignment=1 if template_id in ["classic_tech", "campus_placement"] else 0,
        spaceAfter=8
    )

    sec_header_style = ParagraphStyle(
        'DocSecHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13,
        textColor=accent,
        spaceBefore=7,
        spaceAfter=3,
        textTransform='uppercase'
    )

    subhead_style = ParagraphStyle(
        'DocSubhead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=text_color,
        spaceAfter=2
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_color,
        spaceAfter=2
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_color,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2
    )

    story = []

    # 1. Header: Name & Contact
    story.append(Paragraph(_safe_escape(resume_data["candidate_name"]), name_style))

    contact = resume_data.get("contact", {})
    contact_parts = []
    if contact.get("email"): contact_parts.append(contact['email'])
    if contact.get("phone"): contact_parts.append(contact['phone'])
    if contact.get("linkedin"): contact_parts.append(contact['linkedin'])
    if contact.get("github"): contact_parts.append(contact['github'])
    contact_line = " &nbsp;|&nbsp; ".join([_safe_escape(p) for p in contact_parts])
    if contact_line:
        story.append(Paragraph(contact_line, contact_style))

    story.append(HRFlowable(width="100%", thickness=1, color=accent, spaceBefore=2, spaceAfter=6))

    # Helper function to append a section header
    def add_section_header(title: str):
        story.append(Paragraph(_safe_escape(title), sec_header_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D1D5DB"), spaceBefore=1, spaceAfter=4))

    # Determine Section Ordering based on template
    if template_id == "campus_placement":
        order = ["education", "skills", "projects", "coursework"]
    elif template_id == "data_analytics":
        order = ["skills", "projects", "coursework", "education"]
    elif template_id == "modern_minimal":
        order = ["skills", "projects", "education", "coursework"]
    else:  # classic_tech
        order = ["skills", "projects", "education", "coursework"]

    for sec in order:
        if sec == "skills" and resume_data.get("skills"):
            add_section_header("Technical Skills")
            for sk_line in resume_data["skills"]:
                story.append(Paragraph(_safe_escape(sk_line), body_style))
            story.append(Spacer(1, 4))

        elif sec == "education" and resume_data.get("education"):
            add_section_header("Education")
            for edu in resume_data["education"]:
                story.append(Paragraph(_safe_escape(edu), body_style))
            story.append(Spacer(1, 4))

        elif sec == "projects" and resume_data.get("projects"):
            add_section_header("Technical Projects")
            for proj in resume_data["projects"][:4]:
                header_text = f"<b>{_safe_escape(proj['title'])}</b>"
                if proj.get("stack"):
                    header_text += f" <font color='#6B7280'>| {_safe_escape(proj['stack'])}</font>"
                story.append(Paragraph(header_text, subhead_style))
                for b in proj.get("bullets", []):
                    story.append(Paragraph(f"• {_safe_escape(b)}", bullet_style))
            story.append(Spacer(1, 4))

        elif sec == "coursework" and (resume_data.get("coursework") or resume_data.get("certifications")):
            if resume_data.get("coursework"):
                add_section_header("Relevant Coursework")
                story.append(Paragraph(_safe_escape(", ".join(resume_data["coursework"])), body_style))
                story.append(Spacer(1, 4))
            if resume_data.get("certifications"):
                add_section_header("Certifications")
                for cert in resume_data["certifications"]:
                    story.append(Paragraph(f"• {_safe_escape(cert)}", bullet_style))
                story.append(Spacer(1, 4))

    doc.build(story)
    return buffer.getvalue()


def generate_resume_docx(resume_data: Dict[str, Any], template_id: str = "classic_tech") -> bytes:
    """
    Renders an ATS-safe editable DOCX Word document using native python-docx styles.
    """
    doc = docx.Document()

    # Set 0.75 in margins
    for section in doc.sections:
        section.top_margin = Inches(0.6)
        section.bottom_margin = Inches(0.6)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)

    # Accent color in RGB
    theme_rgb = {
        "classic_tech": RGBColor(0x1E, 0x3A, 0x8A),
        "modern_minimal": RGBColor(0x25, 0x63, 0xEB),
        "data_analytics": RGBColor(0x0F, 0x76, 0x6E),
        "campus_placement": RGBColor(0x11, 0x18, 0x27)
    }
    accent_rgb = theme_rgb.get(template_id, RGBColor(0x1E, 0x3A, 0x8A))

    # Name Paragraph
    p_name = doc.add_paragraph()
    if template_id in ["classic_tech", "campus_placement"]:
        p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_name = p_name.add_run(resume_data.get("candidate_name", "Candidate"))
    run_name.font.name = 'Calibri'
    run_name.font.size = Pt(20)
    run_name.font.bold = True
    run_name.font.color.rgb = accent_rgb

    # Contact Info
    contact = resume_data.get("contact", {})
    contact_parts = []
    if contact.get("email"): contact_parts.append(contact['email'])
    if contact.get("phone"): contact_parts.append(contact['phone'])
    if contact.get("linkedin"): contact_parts.append(contact['linkedin'])
    if contact.get("github"): contact_parts.append(contact['github'])

    if contact_parts:
        p_contact = doc.add_paragraph()
        if template_id in ["classic_tech", "campus_placement"]:
            p_contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_contact = p_contact.add_run(" | ".join(contact_parts))
        run_contact.font.name = 'Calibri'
        run_contact.font.size = Pt(9.5)
        run_contact.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

    def add_docx_heading(title: str):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(8)
        h.paragraph_format.space_after = Pt(2)
        run = h.add_run(title.upper())
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = accent_rgb

    # Determine Section Ordering
    if template_id == "campus_placement":
        order = ["education", "skills", "projects", "coursework"]
    elif template_id in ["data_analytics", "modern_minimal"]:
        order = ["skills", "projects", "education", "coursework"]
    else:
        order = ["skills", "projects", "education", "coursework"]

    for sec in order:
        if sec == "skills" and resume_data.get("skills"):
            add_docx_heading("Technical Skills")
            for sk in resume_data["skills"]:
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(2)
                r = p.add_run(sk)
                r.font.name = 'Calibri'
                r.font.size = Pt(9.5)

        elif sec == "education" and resume_data.get("education"):
            add_docx_heading("Education")
            for edu in resume_data["education"]:
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(2)
                r = p.add_run(edu)
                r.font.name = 'Calibri'
                r.font.size = Pt(9.5)

        elif sec == "projects" and resume_data.get("projects"):
            add_docx_heading("Technical Projects")
            for proj in resume_data["projects"][:4]:
                p_head = doc.add_paragraph()
                p_head.paragraph_format.space_before = Pt(4)
                p_head.paragraph_format.space_after = Pt(1)
                r_title = p_head.add_run(proj['title'])
                r_title.font.name = 'Calibri'
                r_title.font.size = Pt(10)
                r_title.font.bold = True
                if proj.get('stack'):
                    r_stack = p_head.add_run(f" | {proj['stack']}")
                    r_stack.font.name = 'Calibri'
                    r_stack.font.size = Pt(9)
                    r_stack.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)

                for b in proj.get("bullets", []):
                    p_b = doc.add_paragraph(style='List Bullet')
                    p_b.paragraph_format.space_after = Pt(2)
                    r_b = p_b.add_run(b)
                    r_b.font.name = 'Calibri'
                    r_b.font.size = Pt(9.5)

        elif sec == "coursework" and (resume_data.get("coursework") or resume_data.get("certifications")):
            if resume_data.get("coursework"):
                add_docx_heading("Relevant Coursework")
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(2)
                r = p.add_run(", ".join(resume_data["coursework"]))
                r.font.name = 'Calibri'
                r.font.size = Pt(9.5)
            if resume_data.get("certifications"):
                add_docx_heading("Certifications")
                for cert in resume_data["certifications"]:
                    p_c = doc.add_paragraph(style='List Bullet')
                    p_c.paragraph_format.space_after = Pt(2)
                    r_c = p_c.add_run(cert)
                    r_c.font.name = 'Calibri'
                    r_c.font.size = Pt(9.5)

    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()

