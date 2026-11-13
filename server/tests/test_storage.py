import os
import pytest
from fastapi.testclient import TestClient
from app import app
from utils.storage import upload_file, download_file, LOCAL_UPLOAD_DIR

client = TestClient(app)

def test_storage_local_upload_and_download():
    """Verify that uploading a file locally saves it and download_file retrieves it."""
    file_bytes = b"Hello, this is a mock resume document."
    filename = "test_resume.txt"
    content_type = "text/plain"

    # Save
    file_url = upload_file(file_bytes, filename, content_type)
    assert file_url.startswith("/api/uploads/")

    # Retrieve
    retrieved_bytes = download_file(file_url)
    assert retrieved_bytes == file_bytes

    # Cleanup local file
    local_filename = file_url.split("/")[-1]
    local_path = os.path.join(LOCAL_UPLOAD_DIR, local_filename)
    if os.path.exists(local_path):
        os.remove(local_path)

def test_parse_pdf_and_upload():
    """Verify that a valid PDF file returns a parsed text and file_url."""
    # A tiny valid PDF signature stream
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
    
    response = client.post(
        "/api/parse-pdf",
        files={"file": ("test_resume.pdf", pdf_content, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "file_url" in data
    assert data["file_url"].startswith("/api/uploads/")

    # Verify serving endpoint
    file_url = data["file_url"]
    filename = file_url.split("/")[-1]
    
    get_response = client.get(f"/api/uploads/{filename}")
    assert get_response.status_code == 200
    assert get_response.content == pdf_content

    # Cleanup
    local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
    if os.path.exists(local_path):
        os.remove(local_path)

def test_presigned_url_local_fallback():
    from utils.storage import generate_presigned_url
    local_url = "/api/uploads/sample-1234.pdf"
    presigned = generate_presigned_url(local_url)
    assert presigned == local_url
    assert generate_presigned_url("") == ""

def test_delete_file_local():
    from utils.storage import upload_file, delete_file
    file_bytes = b"Temp file content"
    file_url = upload_file(file_bytes, "temp.txt", "text/plain")
    assert delete_file(file_url) is True
    assert delete_file(file_url) is False  # Second time should be False

def test_directory_traversal_detection():
    # Attempting to fetch a traversal path should return 400
    res = client.get("/api/uploads/..%2Fetc%2Fpasswd")
    assert res.status_code in [400, 404]
