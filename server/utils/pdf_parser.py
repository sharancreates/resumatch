import re
import fitz  # PyMuPDF

def parse_pdf(file_stream):
    try:
        file_bytes = file_stream.read()
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
            
        if not text:
            return ""
        clean_text = re.sub(r'\s+', ' ', text).strip()
        return clean_text
    except Exception as e:
        raise RuntimeError(f"PDF parsing error: {str(e)}") from e