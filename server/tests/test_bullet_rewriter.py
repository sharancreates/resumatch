import pytest
from fastapi import HTTPException
from services.bullet_rewriter import (
    rewrite_single_bullet,
    tailor_resume_to_job,
    check_and_increment_llm_quota,
    _offline_grounded_rewrite,
    _user_daily_counts,
    _llm_quota_lock
)


def test_offline_grounded_rewrite_weak_phrase():
    bullet = "worked on building a real-time chat application"
    res = _offline_grounded_rewrite(bullet, target_keyword="WebSockets")

    assert res["original"] == bullet
    # Weak starter "worked on" should be replaced
    assert not res["rewritten"].lower().startswith("worked on")
    # Strong action verb used
    assert any(res["rewritten"].startswith(v) for v in ["Engineered", "Built", "Architected", "Implemented"])
    # Target keyword incorporated
    assert "WebSockets" in res["rewritten"]
    # Metric placeholder appended
    assert "[Add your metric:" in res["rewritten"]


def test_rewrite_single_bullet_preserves_existing_metrics():
    # If a bullet already has numbers, do not double-append placeholder
    bullet = "Optimized PostgreSQL database queries, reducing latency by 45% across 10,000 requests"
    res = rewrite_single_bullet(bullet)

    assert "45%" in res["rewritten"]
    # Should not append [Add your metric] since it already has a metric
    assert "[Add your metric:" not in res["rewritten"]


def test_tailor_resume_to_job():
    sample_resume = """
Aarav Sharma
aarav@example.com | +91 9876543210

Projects
Campus Management Portal
- worked on creating the backend API endpoints
- assisted with database schema design
"""
    job_text = "Looking for a backend developer skilled in FastAPI, PostgreSQL, and Docker."
    missing = ["FastAPI", "PostgreSQL", "Docker"]

    res = tailor_resume_to_job(sample_resume, job_text, missing)

    assert len(res["changes_summary"]) > 0
    assert len(res["keywords_integrated"]) > 0
    # Contact info should remain intact
    assert "aarav@example.com" in res["tailored_text"]
    assert "+91 9876543210" in res["tailored_text"]
    # Keywords should appear in tailored resume
    assert any(kw in res["tailored_text"] for kw in ["FastAPI", "PostgreSQL", "Docker"])


def test_llm_daily_quota_enforcement():
    test_user_id = "test_user_quota_check_123"
    with _llm_quota_lock:
        if test_user_id in _user_daily_counts:
            del _user_daily_counts[test_user_id]

    # Free user limit is 5
    for i in range(5):
        rem = check_and_increment_llm_quota(test_user_id, is_premium=False)
        assert rem == 4 - i

    # 6th call should raise 429
    with pytest.raises(HTTPException) as exc:
        check_and_increment_llm_quota(test_user_id, is_premium=False)
    assert exc.value.status_code == 429
    assert "Daily AI rewrite quota" in exc.value.detail


def test_llm_premium_quota():
    premium_user_id = "test_user_premium_quota_456"
    with _llm_quota_lock:
        if premium_user_id in _user_daily_counts:
            del _user_daily_counts[premium_user_id]

    # Premium user should be able to do at least 15 calls without 429
    for _ in range(15):
        rem = check_and_increment_llm_quota(premium_user_id, is_premium=True)
        assert rem >= 0

