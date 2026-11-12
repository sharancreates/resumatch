import os
import uuid
from datetime import datetime, timezone
from services.report_generator import build_ats_report_pdf
from models import Report

class MockAnalysis:
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.score = 85.5
        self.lexical_score = 80.0
        self.semantic_score = 90.0
        self.missing_keywords = ["Docker", "Kubernetes", "GraphQL"]
        self.recommendations = [
            "Add hands-on containerization experience to projects.",
            "Quantify impact with percentage growth metrics."
        ]
        self.created_at = datetime.now(timezone.utc)

def test_build_ats_report_pdf():
    mock_analysis = MockAnalysis()
    pdf_bytes = build_ats_report_pdf(
        analysis=mock_analysis,
        candidate_name="Jane Developer"
    )
    
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    # Must have PDF header signature
    assert pdf_bytes.startswith(b'%PDF-')
    # Must have PDF trailer / EOF
    assert b'%%EOF' in pdf_bytes[-1024:]

def test_report_model_to_dict():
    report_id = str(uuid.uuid4())
    org_id = str(uuid.uuid4())
    analysis_id = str(uuid.uuid4())
    
    report = Report(
        id=report_id,
        organization_id=org_id,
        name="ATS Match Report - Score: 85%",
        description="Candidate evaluation",
        analysis_ids=[analysis_id],
        pdf_url=f"/api/uploads/report_{analysis_id}.pdf",
        created_at=datetime.now(timezone.utc)
    )
    
    data = report.to_dict()
    assert data["id"] == report_id
    assert data["organization_id"] == org_id
    assert data["name"] == "ATS Match Report - Score: 85%"
    assert data["analysis_ids"] == [analysis_id]
    assert data["pdf_url"].startswith("/api/uploads/")
    assert data["created_at"] is not None
