import io
import re
import pytest
from utils.resume_parser import parse_contact_details, segment_resume, parse_resume_structure

def test_parse_contact_details():
    text = "Candidate Name\nEmail: test@example.com\nPhone: +1-555-555-5555\nLinkedIn: https://linkedin.com/in/testuser"
    contact = parse_contact_details(text)
    assert contact["email"] == "test@example.com"
    assert contact["phone"] == "+1-555-555-5555"
    assert "testuser" in contact["linkedin"]

def test_segment_resume():
    text = """
    Jane Doe
    
    Technical Skills
    Python, Javascript, React
    
    Professional Experience
    Software Engineer at TechCorp. Built scalable microservices.
    
    Education
    B.S. Computer Science at Stanford University
    """
    sections = segment_resume(text)
    assert "Python" in sections["skills"]
    assert "TechCorp" in sections["experience"]
    assert "Stanford" in sections["education"]

def test_segment_resume_all_sections_with_bullets():
    """Verify segment_resume handles headers with bullets and parses all standard sections."""
    text = """
    John Smith
    john@example.com
    
    • Technical Skills
    Python, FastAPI, PostgreSQL, Docker
    
    - Work Experience
    Lead Developer at Acme Corp. Designed cloud architectures.
    
    * Education
    M.S. Software Engineering, Carnegie Mellon
    
    Projects
    ResuMatch AI - ATS scoring platform with semantic embeddings.
    """
    sections = segment_resume(text)
    assert "FastAPI" in sections["skills"]
    assert "Acme Corp" in sections["experience"]
    assert "Carnegie Mellon" in sections["education"]
    assert "ResuMatch" in sections["projects"]

def test_parser_whitespace_contract():
    """Verify the whitespace normalization regex contract preserves structural newlines."""
    raw_extracted = "Jane Doe    \t  \n\n\n\nTechnical Skills\nPython,  \t  FastAPI\n\nWork Experience\nEngineer at Scale"
    # Same logic applied in pdf_parser and docx_parser
    clean = raw_extracted.replace('\r\n', '\n').replace('\r', '\n')
    clean = re.sub(r'[^\S\n]+', ' ', clean)
    clean = re.sub(r'\n[^\S\n]+\n', '\n\n', clean)
    clean = re.sub(r'\n{3,}', '\n\n', clean).strip()

    assert "\n" in clean
    lines = clean.split('\n')
    assert len(lines) >= 4
    sections = segment_resume(clean)
    assert "Python" in sections["skills"]
    assert "Engineer at Scale" in sections["experience"]

def test_parse_pdf_in_memory():
    """Verify parse_pdf preserves newlines using an in-memory PDF stream if PyMuPDF is available."""
    try:
        import fitz
    except ImportError:
        pytest.skip("PyMuPDF / fitz not installed in current environment")

    from utils.pdf_parser import parse_pdf
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Jane Doe\nTechnical Skills\nPython, FastAPI\nWork Experience\nSenior Dev")
    pdf_bytes = doc.write()
    stream = io.BytesIO(pdf_bytes)

    extracted = parse_pdf(stream)
    assert "\n" in extracted
    sections = segment_resume(extracted)
    assert "Python" in sections["skills"] or "FastAPI" in extracted

def test_parse_docx_in_memory():
    """Verify parse_docx preserves newlines using an in-memory docx stream if python-docx is available."""
    try:
        import docx
    except ImportError:
        pytest.skip("python-docx not installed in current environment")

    from utils.docx_parser import parse_docx
    doc = docx.Document()
    doc.add_paragraph("Jane Doe")
    doc.add_paragraph("Technical Skills")
    doc.add_paragraph("Python, React")
    doc.add_paragraph("Professional Experience")
    doc.add_paragraph("Software Engineer at CloudCorp")
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)

    extracted = parse_docx(stream)
    assert "\n" in extracted
    sections = segment_resume(extracted)
    assert "Python" in sections["skills"]

