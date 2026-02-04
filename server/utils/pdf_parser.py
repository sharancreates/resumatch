import re
from pdfminer.high_level import extract_text

def parse_pdf(file_stream):
    try:
        # Disable caching in pdfminer to save RAM
        text = extract_text(file_stream, maxpages=2, caching=False) 
        
        if not text:
            return ""

        # Collapse multiple spaces into one
        clean_text = re.sub(r'\s+', ' ', text).strip()
        return clean_text
    except Exception as e:
        raise Exception(f"PDF parsing error: {str(e)}")