import re
import fitz  # PyMuPDF

def parse_pdf(file_stream):
    try:
        file_bytes = file_stream.read()
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            page_text = page.get_text()
            if page_text:
                text += page_text + "\n"
            
        if not text:
            return ""
        # Normalize carriage returns and horizontal whitespace while preserving newlines
        clean_text = text.replace('\r\n', '\n').replace('\r', '\n')
        clean_text = re.sub(r'[^\S\n]+', ' ', clean_text)
        clean_text = re.sub(r'\n[^\S\n]+\n', '\n\n', clean_text)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)
        return clean_text.strip()
    except Exception as e:
        raise RuntimeError(f"PDF parsing error: {str(e)}") from e