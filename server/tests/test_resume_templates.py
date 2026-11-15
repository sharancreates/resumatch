import asyncio
from io import BytesIO
import pytest
import docx
from fastapi import HTTPException
from unittest.mock import MagicMock

from services.resume_templates import (
    TEMPLATES_CATALOG,
    normalize_resume_data,
    generate_resume_pdf,
    generate_resume_docx
)
from routes.analyze import (
    list_resume_templates,
    export_resume_document,
    ExportResumeRequest
)


SAMPLE_FRESHER_RESUME = """Aarav Sharma
aarav@example.com | +91 9876543210 | linkedin.com/in/aarav | github.com/aarav

Education
B.Tech in Computer Science and Engineering, National Institute of Technology (2020-2024) - CGPA: 8.9/10

Technical Skills
Languages: Python, JavaScript, SQL, C++
Frameworks & Tools: FastAPI, React, Docker, Git, PostgreSQL, PyTorch

Technical Projects
Distributed Job Scheduler | Python, Redis, Docker
- Built an asynchronous background worker queue handling 50,000 tasks/hour
- Reduced task execution latency by 35% through Redis-backed in-memory caching
- Integrated Docker container orchestration with automated health checks

Real-time Collaborative Whiteboard | React, WebSockets, Node.js
- Engineered full-duplex canvas sync supporting 100+ concurrent active editors
- Implemented operational transformation algorithms eliminating cursor conflicts

Coursework
Data Structures and Algorithms, Database Systems, Computer Networks, Operating Systems

Certifications
AWS Certified Cloud Practitioner, Deep Learning Specialization (Coursera)
"""


def test_normalize_resume_data():
    data = normalize_resume_data(SAMPLE_FRESHER_RESUME)
    assert data["candidate_name"] == "Aarav Sharma"
    assert "aarav@example.com" in data["contact"].get("email", "")
    assert len(data["education"]) >= 1
    assert any("CGPA: 8.9" in edu for edu in data["education"])
    assert len(data["skills"]) >= 1
    assert len(data["projects"]) >= 2
    assert "Distributed Job Scheduler" in data["projects"][0]["title"]
    assert len(data["projects"][0]["bullets"]) >= 2
    assert len(data["coursework"]) >= 1


def test_generate_pdf_all_templates():
    data = normalize_resume_data(SAMPLE_FRESHER_RESUME)
    for template in TEMPLATES_CATALOG:
        t_id = template["id"]
        pdf_bytes = generate_resume_pdf(data, template_id=t_id)
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF-"), f"Template {t_id} failed PDF header check"
        assert len(pdf_bytes) > 1000, f"Template {t_id} generated unexpectedly small PDF"


def test_generate_docx_all_templates():
    data = normalize_resume_data(SAMPLE_FRESHER_RESUME)
    for template in TEMPLATES_CATALOG:
        t_id = template["id"]
        docx_bytes = generate_resume_docx(data, template_id=t_id)
        assert isinstance(docx_bytes, bytes)
        assert docx_bytes.startswith(b"PK\x03\x04"), f"Template {t_id} failed DOCX zip header"
        # Verify valid Word document by parsing with python-docx
        doc = docx.Document(BytesIO(docx_bytes))
        assert len(doc.paragraphs) > 5, f"Template {t_id} rendered too few paragraphs"


def test_list_resume_templates_endpoint():
    res = list_resume_templates()
    assert "templates" in res
    assert len(res["templates"]) == 4
    template_ids = [t["id"] for t in res["templates"]]
    assert "classic_tech" in template_ids
    assert "modern_minimal" in template_ids
    assert "data_analytics" in template_ids
    assert "campus_placement" in template_ids


def test_export_resume_endpoint_pdf():
    req = ExportResumeRequest(
        template_id="campus_placement",
        format="pdf",
        resume_text=SAMPLE_FRESHER_RESUME
    )
    mock_db = MagicMock()
    response = asyncio.run(export_resume_document(req, db=mock_db))
    assert response.status_code == 200
    assert response.media_type == "application/pdf"
    assert response.body.startswith(b"%PDF-")
    assert "attachment; filename=" in response.headers.get("content-disposition", "")
    assert "campus_placement.pdf" in response.headers.get("content-disposition", "")


def test_export_resume_endpoint_docx():
    req = ExportResumeRequest(
        template_id="data_analytics",
        format="docx",
        resume_text=SAMPLE_FRESHER_RESUME
    )
    mock_db = MagicMock()
    response = asyncio.run(export_resume_document(req, db=mock_db))
    assert response.status_code == 200
    assert response.media_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert response.body.startswith(b"PK\x03\x04")
    assert "attachment; filename=" in response.headers.get("content-disposition", "")
    assert "data_analytics.docx" in response.headers.get("content-disposition", "")


def test_export_resume_endpoint_empty_text():
    req = ExportResumeRequest(
        template_id="classic_tech",
        format="pdf",
        resume_text=""
    )
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(export_resume_document(req, db=mock_db))
    assert exc_info.value.status_code == 400

