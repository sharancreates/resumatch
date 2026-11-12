import re
import docx

def parse_docx(file_stream):
    try:
        doc = docx.Document(file_stream)
        paragraphs = [para.text for para in doc.paragraphs]
        text = "\n".join(paragraphs)
        
        # Extract text from tables if present
        table_texts = []
        for table in doc.tables:
            for row in table.rows:
                row_texts = [cell.text for cell in row.cells if cell.text]
                table_texts.append(" ".join(row_texts))
        if table_texts:
            text += "\n" + "\n".join(table_texts)
            
        if not text:
            return ""
        # Normalize carriage returns and horizontal whitespace while preserving newlines
        clean_text = text.replace('\r\n', '\n').replace('\r', '\n')
        clean_text = re.sub(r'[^\S\n]+', ' ', clean_text)
        clean_text = re.sub(r'\n[^\S\n]+\n', '\n\n', clean_text)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)
        return clean_text.strip()
    except Exception as e:
        raise RuntimeError(f"DOCX parsing error: {str(e)}") from e
