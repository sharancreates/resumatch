import re
from pdfminer.high_level import extract_text

def parse_pdf(file_stream):
    try:
        text = extract_text(file_stream)
        clean_text = re.sub(r'\s+', ' ', text).strip() #remove white space
        return clean_text
    except Exception as e:
        raise Exception(f"PDF parsing error: {str(e)}")