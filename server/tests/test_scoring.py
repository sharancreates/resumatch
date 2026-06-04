import pytest
from services.ai_engine import hybrid_match_score, is_model_loaded

def test_exact_match():
    # If resume and job description are identical, match score should be high
    resume = "Python software engineer with Flask experience"
    job = "Python software engineer with Flask experience"
    score, missing, lexical, semantic = hybrid_match_score(resume, job)
    
    if is_model_loaded():
        assert score >= 80.0
    else:
        # If the semantic model is not loaded, semantic score is 0.0,
        # so lexical (100.0) weight is 0.4, resulting in a score of 40.0.
        assert score >= 40.0
        
    assert len(missing) == 0

def test_missing_keywords():
    # Detects if major keywords from job description are missing in the resume
    resume = "Experienced developer with Python and Flask experience."
    job = "Looking for a React developer with PostgreSQL database knowledge."
    score, missing, lexical, semantic = hybrid_match_score(resume, job)
    
    # Check that keywords like 'react' or 'postgresql' are detected as missing
    assert len(missing) > 0
    assert any(word.lower() in ['react', 'postgresql', 'database'] for word in missing)

def test_empty_inputs():
    # Verify that sending empty strings doesn't result in crashes or division by zero
    score, missing, lexical, semantic = hybrid_match_score("", "")
    assert score == 0.0
    assert lexical == 0.0
    assert semantic == 0.0

def test_punctuation_and_case_insensitivity():
    # Matches must be case-insensitive and ignore basic punctuation.
    # We omit extra words like 'JS' to ensure bigrams ('react python', 'python flask') match.
    resume = "REACT!, Python, and FLASK???"
    job = "react, python, flask"
    score, missing, lexical, semantic = hybrid_match_score(resume, job)
    assert len(missing) == 0
    assert lexical == 100.0
