import os
import re
import json
import logging
import threading
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Quota Storage for NFR-COST-01
_llm_quota_lock = threading.Lock()
_user_daily_counts: Dict[str, Dict[str, Any]] = {}
FREE_USER_DAILY_LIMIT = 5
PREMIUM_USER_DAILY_LIMIT = 35

ACTION_VERBS = [
    "Architected", "Engineered", "Developed", "Built", "Optimized",
    "Streamlined", "Implemented", "Designed", "Scaled", "Automated"
]


def check_and_increment_llm_quota(user_id: str, is_premium: bool = False) -> int:
    """
    Enforces per-user daily limits on AI rewrite operations (NFR-COST-01).
    Returns remaining quota count for the day.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    limit = PREMIUM_USER_DAILY_LIMIT if is_premium else FREE_USER_DAILY_LIMIT

    with _llm_quota_lock:
        record = _user_daily_counts.get(user_id, {"date": today, "count": 0})
        if record.get("date") != today:
            record = {"date": today, "count": 0}

        if record["count"] >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily AI rewrite quota ({limit} rewrites) reached. Upgrade or check back tomorrow!"
            )

        record["count"] += 1
        _user_daily_counts[user_id] = record
        return max(0, limit - record["count"])


def _offline_grounded_rewrite(bullet: str, target_keyword: Optional[str] = None) -> Dict[str, Any]:
    """
    Deterministic rule-based rewriter that replaces weak phrasing with strong action verbs,
    incorporates requested keywords, and provides an explicit metric prompt without hallucinating numbers.
    """
    clean_bullet = re.sub(r'^[\s\-\*•◦]+', '', bullet).strip()
    
    # Replace weak starter phrases
    weak_patterns = [
        (r'^(?:i\s+)?worked on\s+(?:developing|building|creating)?', "Engineered"),
        (r'^(?:was\s+)?responsible for\s+', "Spearheaded"),
        (r'^(?:i\s+)?assisted with\s+', "Collaborated to build"),
        (r'^(?:i\s+)?helped (?:to\s+)?', "Implemented"),
        (r'^(?:i\s+)?handled\s+', "Orchestrated"),
        (r'^(?:i\s+)?participated in\s+', "Co-developed"),
        (r'^(?:was\s+)?part of (?:a\s+team\s+that\s+)?', "Engineered core modules for"),
        (r'^(?:i\s+)?learned and used\s+', "Mastered and applied"),
        (r'^(?:i\s+)?contributed to\s+', "Enhanced")
    ]

    transformed = clean_bullet
    matched_verb = "Built"
    for pat, rep in weak_patterns:
        if re.search(pat, transformed, re.IGNORECASE):
            transformed = re.sub(pat, rep + " ", transformed, flags=re.IGNORECASE).strip()
            matched_verb = rep
            break
    else:
        # If no weak starter matched, ensure bullet starts with strong action verb
        first_word = transformed.split()[0] if transformed.split() else ""
        if not any(v.lower() == first_word.lower() for v in ACTION_VERBS):
            transformed = f"Architected and deployed {transformed[0].lower() + transformed[1:] if len(transformed) > 1 else transformed}"
            matched_verb = "Architected"

    # Incorporate target keyword if provided and not already present
    keywords_added = []
    if target_keyword and target_keyword.lower() not in transformed.lower():
        transformed = f"{transformed.rstrip('.')} utilizing {target_keyword}"
        keywords_added.append(target_keyword)

    # Check if bullet already contains a quantifiable metric
    has_metric = bool(re.search(r'(?:\d+(?:\.\d+)?%|\b\d+x\b|\b\d+(?:,\d{3})*\+?\s*(?:users|active users|tasks|queries|requests|stars|downloads|ms|seconds|minutes)\b)', transformed, re.IGNORECASE))
    
    placeholder = "[Add your metric: e.g. 500+ users / 35% speedup / 10k tasks]"
    if not has_metric:
        transformed = f"{transformed.rstrip('.')} resulting in {placeholder}."
    else:
        transformed = transformed.rstrip('.') + "."

    return {
        "original": bullet.strip(),
        "rewritten": transformed,
        "action_verb": matched_verb,
        "metric_placeholder": placeholder if not has_metric else "",
        "keywords_added": keywords_added
    }


def rewrite_single_bullet(bullet: str, target_keyword: Optional[str] = None, project_title: Optional[str] = None) -> Dict[str, Any]:
    """
    Transforms a single resume bullet point using Gemini 1.5 Flash with strict anti-hallucination guardrails,
    falling back to deterministic offline grounding if API is unavailable.
    """
    if not bullet or not bullet.strip():
        return {
            "original": "",
            "rewritten": "",
            "action_verb": "",
            "metric_placeholder": "",
            "keywords_added": []
        }

    gemini_key = os.environ.get('GEMINI_API_KEY')
    if gemini_key:
        prompt = f"""
        You are an expert technical resume coach for Indian college students and freshers applying for campus drives.
        Your task: Rewrite the following resume bullet point to make it assertive, high-impact, and ATS-friendly.

        ORIGINAL BULLET: "{bullet.strip()}"
        TARGET KEYWORD TO WEAVE IN: {target_keyword or "None specified"}
        PROJECT CONTEXT: {project_title or "General Project"}

        STRICT ANTI-HALLUCINATION RULES:
        1. NEVER invent fake metrics, fake user counts, dollar figures, or corporate achievements.
        2. If the bullet lacks numbers, you MUST append an explicit placeholder: "[Add your metric: e.g. 500+ users / 35% speedup / 10k rows]" where the candidate must type their actual numbers.
        3. Start with an assertive action verb (Architected, Engineered, Developed, Optimized, Streamlined, Implemented).
        4. Incorporate the target keyword naturally if provided.
        5. Return ONLY a valid JSON object matching this schema:
        {{
          "rewritten": "Complete rewritten bullet string including metric placeholder if needed",
          "action_verb": "The starting action verb",
          "metric_placeholder": "[Add your metric: e.g. ...]",
          "keywords_added": ["keyword1"]
        }}
        Do not wrap in markdown quotes or extra explanations.
        """
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            res = requests.post(url, headers=headers, json=payload, timeout=8)
            if res.status_code == 200:
                resp_json = res.json()
                raw_text = resp_json['candidates'][0]['content']['parts'][0]['text'].strip()
                if raw_text.startswith("```"):
                    raw_text = re.sub(r'^```[a-zA-Z]*\n', '', raw_text)
                    raw_text = re.sub(r'\n```$', '', raw_text)
                parsed = json.loads(raw_text)
                return {
                    "original": bullet.strip(),
                    "rewritten": parsed.get("rewritten", "").strip(),
                    "action_verb": parsed.get("action_verb", "Built"),
                    "metric_placeholder": parsed.get("metric_placeholder", ""),
                    "keywords_added": parsed.get("keywords_added", [target_keyword] if target_keyword else [])
                }
        except Exception as e:
            logger.warning("Gemini rewrite API unavailable (%s). Using offline grounded generator.", e)

    # Offline deterministic fallback
    return _offline_grounded_rewrite(bullet, target_keyword)


def tailor_resume_to_job(
    resume_text: str,
    job_text: str,
    missing_keywords: List[str],
    sections: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Produces a 1-click tailored resume version aligned with a target Job Description.
    Weaves top missing skills into relevant project bullet points groundedly,
    preserves applicant contact details and education, and formats for ATS compliance.
    """
    if not resume_text:
        return {
            "tailored_text": "",
            "changes_summary": [],
            "keywords_integrated": []
        }

    lines = resume_text.split('\n')
    tailored_lines = []
    changes_summary = []
    keywords_integrated = []
    keywords_queue = list(missing_keywords[:4])

    in_projects = False
    bullets_modified = 0

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()

        # Detect section transition
        if any(h in lower for h in ["project", "academic projects", "personal projects"]) and len(stripped) < 40:
            in_projects = True
            tailored_lines.append(line)
            continue
        elif any(h in lower for h in ["experience", "education", "skills", "certifications", "coursework"]) and len(stripped) < 40 and not stripped.startswith(('-', '*', '•')):
            in_projects = False
            tailored_lines.append(line)
            continue

        # Look for bullet points inside projects that can be strengthened
        is_bullet = stripped.startswith(('-', '*', '•', '◦')) or (in_projects and len(stripped) > 20 and not stripped.endswith(':'))

        if in_projects and is_bullet and bullets_modified < 3 and keywords_queue:
            # Check if line contains passive or weak phrasing
            is_weak = any(wp in lower for wp in ["worked on", "assisted", "helped", "responsible for", "handled", "was part of"])
            
            if is_weak or bullets_modified == 0:
                target_kw = keywords_queue.pop(0)
                rewritten_res = rewrite_single_bullet(stripped, target_kw)
                new_bullet = f"- {rewritten_res['rewritten']}" if not stripped.startswith(('-', '*', '•')) else f"{stripped[:2]} {rewritten_res['rewritten']}"
                
                tailored_lines.append(new_bullet)
                changes_summary.append({
                    "original": stripped,
                    "tailored": new_bullet.strip(),
                    "keyword_added": target_kw
                })
                keywords_integrated.append(target_kw)
                bullets_modified += 1
                continue

        tailored_lines.append(line)

    tailored_text = "\n".join(tailored_lines)

    return {
        "tailored_text": tailored_text,
        "changes_summary": changes_summary,
        "keywords_integrated": keywords_integrated
    }

