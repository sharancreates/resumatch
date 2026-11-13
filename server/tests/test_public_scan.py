import asyncio
import pytest
from fastapi import HTTPException
from starlette.requests import Request
from routes.analyze import (
    analyze_public_endpoint,
    get_scorecard_endpoint,
    reset_public_scan_limits,
    PublicAnalyzeRequest,
    PUBLIC_FREE_SCAN_LIMIT
)


def create_test_request(ip="127.0.0.1", headers=None) -> Request:
    header_list = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/analyze/public",
        "headers": header_list,
        "client": (ip, 50000),
    }
    return Request(scope)


@pytest.fixture(autouse=True)
def cleanup_limits():
    reset_public_scan_limits()
    yield
    reset_public_scan_limits()


def test_public_scan_empty_input_rejected():
    """Verify that empty resume or job text raises 400 Bad Request."""
    req = PublicAnalyzeRequest(resume="", job="FastAPI developer")
    mock_req = create_test_request()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(analyze_public_endpoint(mock_req, req))

    assert exc_info.value.status_code == 400
    assert "Both resume text and target job description are required" in exc_info.value.detail


def test_public_scan_length_limit():
    """Verify that inputs exceeding 20,000 characters are rejected with 400."""
    huge_resume = "Python developer " * 1500  # > 20k chars
    req = PublicAnalyzeRequest(resume=huge_resume, job="Python engineer")
    mock_req = create_test_request()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(analyze_public_endpoint(mock_req, req))

    assert exc_info.value.status_code == 400
    assert "exceeds maximum allowed length" in exc_info.value.detail


def test_public_scan_quota_and_scorecard_generation():
    """Verify that anonymous scans allow up to 3 calls and block the 4th with 429."""
    resume_text = "Junior Software Developer with experience in Python, FastAPI, React, and SQL."
    job_text = "Looking for a Python Developer with FastAPI, PostgreSQL, and Docker skills."
    client_id = "test_student_session_123"

    mock_req = create_test_request(ip="192.168.1.100")
    req = PublicAnalyzeRequest(resume=resume_text, job=job_text, client_id=client_id)

    # 1st scan
    res1 = asyncio.run(analyze_public_endpoint(mock_req, req))
    assert res1["status"] == "success"
    assert res1["data"]["scans_remaining"] == 2
    assert "scorecard_id" in res1["data"]
    sc_id = res1["data"]["scorecard_id"]

    # Retrieve public scorecard
    sc_res = get_scorecard_endpoint(sc_id)
    assert sc_res["status"] == "success"
    assert sc_res["scorecard"]["id"] == sc_id
    assert sc_res["scorecard"]["score"] == res1["data"]["score"]
    assert "top_missing_skills" in sc_res["scorecard"]

    # 2nd scan
    res2 = asyncio.run(analyze_public_endpoint(mock_req, req))
    assert res2["data"]["scans_remaining"] == 1

    # 3rd scan
    res3 = asyncio.run(analyze_public_endpoint(mock_req, req))
    assert res3["data"]["scans_remaining"] == 0

    # 4th scan should be blocked with 429
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(analyze_public_endpoint(mock_req, req))

    assert exc_info.value.status_code == 429
    assert "used all 3 free scans" in exc_info.value.detail


def test_scorecard_not_found():
    """Verify that querying a non-existent scorecard ID returns 404."""
    with pytest.raises(HTTPException) as exc_info:
        get_scorecard_endpoint("non_existent_sc_id_999")

    assert exc_info.value.status_code == 404
