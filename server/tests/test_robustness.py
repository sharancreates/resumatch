import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_upload_magic_bytes_pdf_validation():
    """Verify that uploading a text file disguised as a PDF is rejected."""
    response = client.post(
        "/api/parse-pdf",
        files={"file": ("resume.pdf", b"Hello world, I am pretending to be a PDF resume.", "application/pdf")}
    )
    assert response.status_code == 400
    assert "Invalid file signature" in response.json()["detail"]

def test_upload_magic_bytes_docx_validation():
    """Verify that uploading a text file disguised as a DOCX is rejected."""
    response = client.post(
        "/api/parse-pdf",
        files={"file": ("resume.docx", b"Hello world, I am pretending to be a DOCX resume.", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    )
    assert response.status_code == 400
    assert "Invalid file signature" in response.json()["detail"]
