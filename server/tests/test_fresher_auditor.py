import pytest
from services.fresher_auditor import (
    audit_project_quality,
    audit_sections_and_links,
    detect_action_verbs_and_weak_phrases,
    audit_ats_layout_and_formatting,
    run_fresher_audit
)
from utils.resume_parser import parse_resume_structure


SAMPLE_WEAK_RESUME = """
John Doe
cool_gamer99@yahoo.com | 1234567

Education
College of Engineering

Skills
Python, Java, C++, React, Node, SQL, Docker, HTML, CSS, Git

Projects
Website Project
Worked on a website project with my team. Responsible for creating pages and helping to fix bugs. Learned React and tried to make it fast. Assisted with backend tasks.

Another App
Was part of a team that worked on an Android app. Handled basic features.
"""

SAMPLE_STRONG_RESUME = """
Aarav Sharma
aarav.sharma@gmail.com | +91 9876543210
linkedin.com/in/aaravsharma | github.com/aaravsharma

Education
B.Tech in Computer Science and Engineering, Expected May 2025
National Institute of Technology | CGPA: 8.7 / 10.0

Relevant Coursework
Data Structures and Algorithms, Database Management Systems (DBMS), Operating Systems, Computer Networks, Object-Oriented Programming

Technical Skills
Languages: Python, Java, TypeScript, C++, SQL
Frameworks & Libraries: React, FastAPI, Node.js, Express, PyTorch, TailwindCSS
Databases & Cloud: PostgreSQL, Redis, MongoDB, Docker, AWS, Git

Projects
Distributed Task Queue Engine | Python, Redis, FastAPI, Docker
- Architected an asynchronous job processing system processing over 25,000 tasks daily with Redis pub/sub.
- Optimized worker concurrency and reduced average queue latency by 42% across distributed worker nodes.
- Engineered automated REST APIs with FastAPI and packaged deployment using Docker containers.

Campus Placement Portal | React, TypeScript, PostgreSQL, Node.js
- Built a role-based full-stack web application serving 1,200+ students and recruiters for college drive scheduling.
- Implemented real-time status notifications and cut candidate screening time by 30%.
- Designed relational database schemas in PostgreSQL with indexed queries achieving sub-50ms responses.
"""


def test_audit_project_quality_weak():
    weak_proj_text = """
    Website Project
    Worked on a website project with my team. Responsible for creating pages.
    """
    res = audit_project_quality(weak_proj_text)
    assert res["score"] < 70
    assert res["projects_with_metrics"] == 0
    # Should flag missing metrics
    assert any("metric" in iss["message"].lower() or "number" in iss["message"].lower() for iss in res["issues"])


def test_audit_project_quality_strong():
    strong_proj_text = """
    Distributed Task Queue Engine | Python, Redis, FastAPI, Docker
    - Architected an asynchronous job processing system processing over 25,000 tasks daily.
    - Optimized worker concurrency and reduced average queue latency by 42%.

    Campus Placement Portal | React, TypeScript, PostgreSQL, Node.js
    - Built a full-stack web application serving 1,200+ active users.
    """
    res = audit_project_quality(strong_proj_text)
    assert res["score"] >= 80
    assert res["projects_with_metrics"] >= 2
    assert res["projects_with_tech"] >= 2


def test_audit_sections_and_links_missing_github():
    structure = parse_resume_structure(SAMPLE_WEAK_RESUME)
    res = audit_sections_and_links(
        SAMPLE_WEAK_RESUME,
        structure["sections"],
        structure["contact_details"]
    )
    assert res["score"] < 75
    assert res["github"] is None
    # Must flag critical missing github
    assert any("github" in iss["message"].lower() for iss in res["issues"])


def test_audit_sections_and_links_strong():
    structure = parse_resume_structure(SAMPLE_STRONG_RESUME)
    res = audit_sections_and_links(
        SAMPLE_STRONG_RESUME,
        structure["sections"],
        structure["contact_details"]
    )
    assert res["score"] >= 85
    assert res["github"] is not None
    assert res["linkedin"] is not None
    assert len(res["coursework_found"]) >= 3
    assert res["has_categorized_skills"] is True


def test_detect_action_verbs_and_weak_phrases():
    res = detect_action_verbs_and_weak_phrases(SAMPLE_WEAK_RESUME)
    assert res["weak_phrases_count"] >= 4
    # Must identify specific weak phrases
    phrases = [f["weak_phrase"] for f in res["findings"]]
    assert "worked on" in phrases
    assert "responsible for" in phrases

    # Strong resume should have 0 weak phrases
    res_strong = detect_action_verbs_and_weak_phrases(SAMPLE_STRONG_RESUME)
    assert res_strong["weak_phrases_count"] == 0


def test_audit_ats_layout_and_formatting():
    # Test weak resume with unprofessional email
    res_weak = audit_ats_layout_and_formatting(SAMPLE_WEAK_RESUME)
    assert any("informal" in iss["message"].lower() or "unprofessional" in iss["message"].lower() for iss in res_weak["issues"])

    # Test strong resume
    res_strong = audit_ats_layout_and_formatting(SAMPLE_STRONG_RESUME)
    assert res_strong["estimated_pages"] == 1
    assert any("ideal length" in p.lower() or "word count" in p.lower() for p in res_strong["passed"])


def test_run_fresher_audit_end_to_end():
    # Weak resume
    structure_weak = parse_resume_structure(SAMPLE_WEAK_RESUME)
    weak_audit = run_fresher_audit(SAMPLE_WEAK_RESUME, structure_weak)
    assert weak_audit["fresher_score"] < 65
    assert weak_audit["readiness_verdict"] in ["Needs Polish", "High Rejection Risk"]
    assert len(weak_audit["critical_fixes"]) > 0

    # Strong resume
    structure_strong = parse_resume_structure(SAMPLE_STRONG_RESUME)
    strong_audit = run_fresher_audit(SAMPLE_STRONG_RESUME, structure_strong)
    assert strong_audit["fresher_score"] >= 80
    assert strong_audit["readiness_verdict"] == "Campus Placement Ready"

    # Empty resume edge case
    empty_audit = run_fresher_audit("")
    assert empty_audit["fresher_score"] == 0
    assert empty_audit["readiness_verdict"] == "Empty Resume"

