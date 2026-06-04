import re

SECTION_HEADERS = {
    "contact": ["contact", "personal info", "details", "links", "personal profile", "contact details"],
    "skills": ["skills", "technical skills", "technologies", "proficiencies", "core competencies", "skills & tools", "technical proficiencies", "technical expertise", "expertise"],
    "experience": ["experience", "work experience", "employment history", "professional experience", "work history", "employment", "professional background", "career history"],
    "education": ["education", "academic background", "academic credentials", "degrees", "educational background", "academic history", "academic profile"],
    "projects": ["projects", "academic projects", "personal projects", "selected projects", "key projects", "development projects"]
}

def clean_header(line):
    # Strip bullet points and punctuation, then normalize spacing
    line = re.sub(r'^[\s\-\*•◦]+', '', line)
    line = re.sub(r'[^a-zA-Z\s&]', '', line).strip().lower()
    return line

def identify_section(line):
    cleaned = clean_header(line)
    if not cleaned or len(cleaned) > 35:
        return None
    for sec, headers in SECTION_HEADERS.items():
        if cleaned in headers:
            return sec
    return None

def parse_contact_details(text):
    # Extract email address
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    email = email_match.group(0) if email_match else None
    
    # Extract phone numbers of various formats
    phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else None
    
    # Extract LinkedIn profiles
    linkedin_match = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+', text)
    linkedin = linkedin_match.group(0) if linkedin_match else None
    
    return {
        "email": email,
        "phone": phone,
        "linkedin": linkedin
    }

def segment_resume(text):
    sections = {
        "contact": "",
        "skills": "",
        "experience": "",
        "education": "",
        "projects": "",
        "other": ""
    }
    
    lines = text.split('\n')
    current_section = "other"
    
    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            continue
            
        # Inspect if line resembles a section header
        sec = identify_section(stripped_line)
        if sec:
            current_section = sec
            continue
            
        sections[current_section] += line + '\n'
        
    for k in sections:
        sections[k] = sections[k].strip()
        
    return sections

def parse_resume_structure(text):
    contact = parse_contact_details(text)
    sections = segment_resume(text)
    
    # Ensure contact section matches parsed fields if segment text is empty
    if not sections["contact"] and (contact["email"] or contact["phone"] or contact["linkedin"]):
        contact_lines = []
        if contact["email"]: contact_lines.append(f"Email: {contact['email']}")
        if contact["phone"]: contact_lines.append(f"Phone: {contact['phone']}")
        if contact["linkedin"]: contact_lines.append(f"LinkedIn: {contact['linkedin']}")
        sections["contact"] = "\n".join(contact_lines)
        
    return {
        "contact_details": contact,
        "sections": sections
    }
