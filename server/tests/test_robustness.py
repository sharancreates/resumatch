import pytest
from io import BytesIO
from app import app

def test_upload_magic_bytes_pdf_validation():
    """Verify that uploading a text file disguised as a PDF is rejected."""
    with app.test_client() as client:
        data = {
            'file': (BytesIO(b"Hello world, I am pretending to be a PDF resume."), 'resume.pdf')
        }
        response = client.post('/api/parse-pdf', data=data, content_type='multipart/form-data')
        assert response.status_code == 400
        assert b"Invalid file signature" in response.data

def test_upload_magic_bytes_docx_validation():
    """Verify that uploading a text file disguised as a DOCX is rejected."""
    with app.test_client() as client:
        data = {
            'file': (BytesIO(b"Hello world, I am pretending to be a DOCX resume."), 'resume.docx')
        }
        response = client.post('/api/parse-pdf', data=data, content_type='multipart/form-data')
        assert response.status_code == 400
        assert b"Invalid file signature" in response.data
