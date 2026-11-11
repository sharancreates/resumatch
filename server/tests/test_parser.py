from utils.resume_parser import parse_contact_details, segment_resume

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
