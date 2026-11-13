import re
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

# Common tech stacks recognized in Indian and global tech fresher hiring
POPULAR_TECH_STACKS = {
    # Languages
    "python", "java", "c++", "c", "c#", "javascript", "typescript", "go", "golang",
    "rust", "kotlin", "swift", "php", "ruby", "sql", "html", "css",
    # Frameworks & Libraries
    "react", "react.js", "reactjs", "node", "node.js", "nodejs", "express", "express.js",
    "fastapi", "flask", "django", "spring", "spring boot", "next.js", "nextjs",
    "vue", "vue.js", "angular", "pytorch", "tensorflow", "keras", "scikit-learn",
    "pandas", "numpy", "tailwind", "tailwindcss", "bootstrap",
    # Databases
    "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite", "cassandra",
    "dynamodb", "oracle", "firebase", "supabase",
    # Cloud & DevOps & Tools
    "aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "linux",
    "ci/cd", "nginx", "postman", "graphql", "rest api", "microservices"
}

# Weak, passive starter phrases and recommended strong action verbs
WEAK_PHRASES_MAP = {
    "worked on": ["built", "engineered", "implemented", "developed", "architected"],
    "responsible for": ["led", "executed", "delivered", "orchestrated"],
    "assisted with": ["collaborated to build", "engineered", "co-developed"],
    "assisted": ["collaborated to implement", "contributed core modules to"],
    "helped to": ["streamlined", "accelerated", "implemented"],
    "helped": ["facilitated", "implemented", "enhanced"],
    "was part of": ["co-developed", "contributed core features to"],
    "handled": ["managed", "orchestrated", "streamlined", "automated"],
    "learned": ["mastered and applied", "implemented", "leveraged"],
    "tried to": ["prototyped", "benchmarked", "evaluated"],
    "participated in": ["competed in", "collaborated on"],
    "contributed to": ["authored", "engineered", "enhanced"],
    "involved in": ["developed", "architected", "deployed"],
    "tasked with": ["executed", "spearheaded", "delivered"],
    "familiar with": ["proficient in", "applied", "skilled in"]
}

# CS Fundamentals keywords for fresher coursework checks
CORE_CS_SUBJECTS = [
    ("data structures", ["data structures", "dsa", "data structures and algorithms", "data structures & algorithms"]),
    ("algorithms", ["algorithms", "algorithm design", "daa"]),
    ("dbms", ["dbms", "database management", "database systems", "sql"]),
    ("operating systems", ["operating systems", "os", "linux fundamentals"]),
    ("computer networks", ["computer networks", "networking", "tcp/ip", "cn"]),
    ("oop", ["object oriented programming", "oop", "oops", "object-oriented design"])
]


def audit_project_quality(projects_text: str, full_text: str = "") -> Dict[str, Any]:
    """
    Evaluates fresher projects for:
    1. Explicit tech stack declaration
    2. Quantifiable results/metrics (numbers, %, scale, latency)
    3. Active personal ownership vs vague group phrasing
    """
    text = projects_text.strip() if projects_text else full_text
    issues: List[Dict[str, str]] = []
    passed: List[str] = []
    projects_detected: List[Dict[str, Any]] = []

    # Attempt to split projects by common project header delimiters
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    current_proj_title = ""
    current_proj_lines: List[str] = []

    for line in lines:
        is_title = (
            not line.startswith(('-', '*', '•', '◦'))
            and (
                ('|' in line and len(line) < 110)
                or (len(line) < 70 and any(keyword in line.lower() for keyword in ["system", "app", "website", "platform", "detector", "bot", "engine", "dashboard", "portal", "tracker", "model", "queue", "pipeline", "service"]))
                or (line.endswith(':') and len(line) < 60)
            )
        )
        if is_title:
            if current_proj_title or current_proj_lines:
                projects_detected.append({
                    "title": current_proj_title or "Project",
                    "content": "\n".join(current_proj_lines)
                })
            current_proj_title = line
            current_proj_lines = []
        else:
            if not current_proj_title:
                current_proj_title = line
            else:
                current_proj_lines.append(line)

    if current_proj_lines or current_proj_title:
        projects_detected.append({
            "title": current_proj_title or "Project Entry",
            "content": "\n".join(current_proj_lines) if current_proj_lines else current_proj_title
        })

    # If parsing couldn't split cleanly, treat the whole projects section as 1 project
    if not projects_detected and text:
        projects_detected.append({
            "title": "Projects Section",
            "content": text
        })

    total_projects = len(projects_detected)
    if total_projects == 0:
        return {
            "score": 30,
            "project_count": 0,
            "issues": [{
                "id": "missing_projects",
                "severity": "critical",
                "message": "No projects section detected. For freshers, projects are the #1 differentiator in lieu of work experience."
            }],
            "passed": [],
            "projects": []
        }

    projects_with_metrics = 0
    projects_with_tech = 0
    analyzed_projects = []

    # Metric detection regex (percentages, numerals with units, multipliers, scale)
    metric_pattern = re.compile(
        r'(?:\d+(?:\.\d+)?%|\b\d+x\b|[\$₹]\s*\d+|\b\d+(?:,\d{3})*(?:\.\d+)?\+?\s*(?:users|active users|daily users|req/s|rps|tasks|queries|requests|stars|downloads|clients|students|records|rows|data points|kb|mb|gb|tb|ms|seconds|minutes|hours)\b)',
        re.IGNORECASE
    )

    for p in projects_detected:
        p_text = f"{p['title']} {p['content']}".lower()
        # Find tech stack matches
        found_tech = [t for t in POPULAR_TECH_STACKS if re.search(rf'\b{re.escape(t)}\b', p_text)]
        found_metrics = metric_pattern.findall(p['content'])

        has_tech = len(found_tech) >= 2
        has_metric = len(found_metrics) > 0

        if has_tech:
            projects_with_tech += 1
        if has_metric:
            projects_with_metrics += 1

        p_issues = []
        if not has_tech:
            p_issues.append("Specify tools and tech stack (e.g. React, Python, PostgreSQL)")
        if not has_metric:
            p_issues.append("Missing numbers/metric (e.g. 'reduced latency by 30%', 'served 200+ users', 'processed 10k rows')")

        # Check for vague team language
        if re.search(r'\b(our team|we worked|assigned to|group of \d+)\b', p_text):
            p_issues.append("Vague team language: use first-person active verbs ('engineered', 'built') to highlight your individual role")

        analyzed_projects.append({
            "title": p["title"][:50],
            "tech_stack": found_tech[:6],
            "metrics_found": found_metrics[:3],
            "has_metrics": has_metric,
            "has_tech": has_tech,
            "issues": p_issues
        })

    # Scoring mechanics
    score = 50
    if total_projects >= 2:
        score += 15
        passed.append(f"Contains {total_projects} projects (meets campus drive benchmark of 2-4 projects)")
    else:
        issues.append({
            "id": "low_project_count",
            "severity": "medium",
            "message": f"Only {total_projects} project found. Aim for 2-3 substantive technical or academic projects."
        })

    if projects_with_tech == total_projects and total_projects > 0:
        score += 15
        passed.append("Every project clearly specifies technologies and libraries used")
    else:
        issues.append({
            "id": "missing_tech_stack",
            "severity": "high",
            "message": f"{total_projects - projects_with_tech} of {total_projects} projects lack explicit tech stack tags."
        })

    if projects_with_metrics > 0:
        metric_ratio = projects_with_metrics / total_projects
        score += int(20 * metric_ratio)
        if metric_ratio >= 0.6:
            passed.append(f"{projects_with_metrics} of {total_projects} projects contain quantifiable impact/metrics")
        else:
            issues.append({
                "id": "low_metric_ratio",
                "severity": "high",
                "message": f"Only {projects_with_metrics} of {total_projects} projects show measurable metrics. Add dataset sizes, user counts, or % performance improvements."
            })
    else:
        issues.append({
            "id": "zero_metrics",
            "severity": "critical",
            "message": "Zero quantifiable metrics found in projects. Recruiters look for numbers: dataset size, accuracy %, user count, or speedups."
        })

    return {
        "score": min(100, max(20, score)),
        "project_count": total_projects,
        "projects_with_metrics": projects_with_metrics,
        "projects_with_tech": projects_with_tech,
        "issues": issues,
        "passed": passed,
        "projects": analyzed_projects
    }


def audit_sections_and_links(resume_text: str, sections: Dict[str, str], contact: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """
    Checks for essential fresher sections and online presence:
    - GitHub profile link (crucial for developers)
    - LinkedIn profile link
    - Categorized Technical Skills (Languages, Frameworks, Tools)
    - Relevant CS Coursework (DSA, DBMS, OS, Networks)
    - Education credentials (Degree, CGPA / Percentage, Graduation year)
    """
    issues: List[Dict[str, str]] = []
    passed: List[str] = []
    score = 100

    lower_text = resume_text.lower()

    # 1. GitHub Link Check
    github_link = contact.get("github")
    if not github_link:
        github_match = re.search(r'(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_-]+', resume_text, re.IGNORECASE)
        if github_match:
            github_link = github_match.group(0)

    if github_link:
        passed.append("GitHub profile link included (critical code proof for freshers)")
    else:
        score -= 25
        issues.append({
            "id": "missing_github",
            "severity": "critical",
            "message": "No GitHub link found. For tech and engineering freshers, a active GitHub profile is essential to verify code quality."
        })

    # 2. LinkedIn Link Check
    linkedin_link = contact.get("linkedin")
    if not linkedin_link:
        li_match = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+', resume_text, re.IGNORECASE)
        if li_match:
            linkedin_link = li_match.group(0)

    if linkedin_link:
        passed.append("LinkedIn profile link present")
    else:
        score -= 15
        issues.append({
            "id": "missing_linkedin",
            "severity": "medium",
            "message": "No LinkedIn profile link detected. Campus recruiters frequently use LinkedIn for background verification."
        })

    # 3. Categorized Technical Skills Check
    skills_text = sections.get("skills", "")
    has_subcategories = bool(re.search(r'(?:languages|frameworks|libraries|databases|tools|technologies|developer tools|platforms)\s*[:\-]', skills_text, re.IGNORECASE))
    
    if has_subcategories or (":" in skills_text and len(skills_text.split(":")) >= 3):
        passed.append("Skills section is categorized by domain (Languages, Frameworks, Tools, etc.)")
    else:
        score -= 15
        issues.append({
            "id": "uncategorized_skills",
            "severity": "medium",
            "message": "Skills section appears to be an uncategorized list. Group your skills into 'Languages', 'Frameworks/Libraries', 'Databases', and 'Developer Tools'."
        })

    # 4. Relevant Coursework / CS Fundamentals Check
    found_coursework = []
    coursework_text = sections.get("coursework", "") + " " + resume_text
    lower_cw = coursework_text.lower()

    for subject_name, keywords in CORE_CS_SUBJECTS:
        if any(re.search(rf'\b{re.escape(kw)}\b', lower_cw) for kw in keywords):
            found_coursework.append(subject_name)

    if len(found_coursework) >= 3:
        passed.append(f"Core CS fundamentals present ({', '.join(found_coursework[:4])})")
    elif len(found_coursework) > 0:
        score -= 10
        issues.append({
            "id": "partial_coursework",
            "severity": "low",
            "message": f"Found only {len(found_coursework)} CS fundamental topics ({', '.join(found_coursework)}). Add core subjects like Data Structures & Algorithms, DBMS, and Operating Systems."
        })
    else:
        score -= 15
        issues.append({
            "id": "missing_coursework",
            "severity": "medium",
            "message": "No relevant CS coursework mentioned. Campus recruiters look for Data Structures, DBMS, OS, and Computer Networks."
        })

    # 5. Education Credentials (CGPA / Degree / Year)
    edu_text = sections.get("education", "") + " " + resume_text
    lower_edu = edu_text.lower()
    has_degree = bool(re.search(r'\b(b\.?tech|b\.?e\.?|bca|mca|b\.?sc|m\.?tech|bachelor|master)\b', lower_edu))
    has_year = bool(re.search(r'\b(202[0-9]|201[8-9])\b', lower_edu))
    has_cgpa = bool(re.search(r'(?:cgpa|gpa|percentage|%|marks)\s*[:\-]?\s*(\d+(?:\.\d+)?)', lower_edu))

    if has_degree and has_year:
        passed.append("Education includes recognized degree and graduation year")
    else:
        score -= 10
        issues.append({
            "id": "incomplete_education",
            "severity": "high",
            "message": "Ensure your degree title (e.g. B.Tech Computer Science) and expected graduation year (e.g. 2025) are clearly visible."
        })

    if not has_cgpa:
        issues.append({
            "id": "missing_cgpa",
            "severity": "low",
            "message": "No CGPA or percentage detected. In Indian campus drives, placement cells filter by minimum cutoff (typically 7.0+ CGPA or 70%)."
        })

    return {
        "score": min(100, max(15, score)),
        "github": github_link,
        "linkedin": linkedin_link,
        "coursework_found": found_coursework,
        "has_categorized_skills": has_subcategories,
        "issues": issues,
        "passed": passed
    }


def detect_action_verbs_and_weak_phrases(resume_text: str) -> Dict[str, Any]:
    """
    Scans resume lines for weak, passive verbs ("worked on", "assisted") and
    suggests high-impact, active alternatives grouped by intent.
    """
    findings: List[Dict[str, Any]] = []
    lines = resume_text.split('\n')

    # Build combined pattern
    weak_keys = sorted(WEAK_PHRASES_MAP.keys(), key=lambda k: -len(k))
    weak_regex = re.compile(rf'\b({"|".join(re.escape(k) for k in weak_keys)})\b', re.IGNORECASE)

    for line_num, raw_line in enumerate(lines, 1):
        line = raw_line.strip()
        if not line or len(line) < 15:
            continue
        
        # Don't flag header lines
        if line.endswith(':') or len(line) < 25 and not line.startswith(('-', '*', '•', '◦')):
            continue

        matches = weak_regex.finditer(line)
        for m in matches:
            matched_phrase = m.group(0).lower()
            suggested = WEAK_PHRASES_MAP.get(matched_phrase, ["built", "engineered", "implemented"])
            
            # Highlight snippet
            snippet = line
            if len(snippet) > 100:
                snippet = snippet[:100] + "..."

            findings.append({
                "line_number": line_num,
                "weak_phrase": matched_phrase,
                "context": snippet,
                "suggested_replacements": suggested
            })

    total_weak = len(findings)
    # 100 points minus 10 per weak phrase, floor at 30
    score = max(30, 100 - (total_weak * 10))

    issues = []
    passed = []

    if total_weak == 0:
        passed.append("No weak or passive starter phrases detected; strong action verb usage")
    elif total_weak <= 2:
        issues.append({
            "id": "minor_passive_verbs",
            "severity": "medium",
            "message": f"Found {total_weak} passive phrases (e.g. '{findings[0]['weak_phrase']}'). Replace with assertive action verbs."
        })
    else:
        issues.append({
            "id": "excessive_passive_verbs",
            "severity": "high",
            "message": f"Found {total_weak} passive phrasing instances ('worked on', 'assisted', etc.). This weakens recruiter perception of your direct contribution."
        })

    return {
        "score": score,
        "weak_phrases_count": total_weak,
        "findings": findings[:10],  # Return up to top 10 for UI actionability
        "issues": issues,
        "passed": passed
    }


def audit_ats_layout_and_formatting(resume_text: str, doc_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Validates ATS layout constraints:
    - 1-page rule enforcement (word count gauge 350-600 words)
    - Table / column delimiter checks
    - Professional contact formatting
    - Standard section headers
    """
    issues: List[Dict[str, str]] = []
    passed: List[str] = []
    score = 100

    words = re.findall(r'\b[a-zA-Z0-9_\-\.]+\b', resume_text)
    word_count = len(words)

    # 1. 1-Page Rule Constraint for Freshers
    if 150 <= word_count <= 620:
        passed.append(f"Ideal length for a 1-page fresher resume ({word_count} words)")
    elif word_count > 620:
        score -= 20
        issues.append({
            "id": "length_warning",
            "severity": "high",
            "message": f"Resume is approximately {word_count} words and likely exceeds 1 page. Freshers with 0-2 years experience should strictly maintain a concise 1-page resume."
        })
    elif word_count < 150:
        score -= 20
        issues.append({
            "id": "too_short",
            "severity": "high",
            "message": f"Resume is only {word_count} words, which looks incomplete. Elaborate on project architecture, responsibilities, and tech stack."
        })
    else:
        passed.append(f"Resume word count: {word_count} words")

    # 2. Table / Column Risk
    pipe_count = resume_text.count('|')
    tab_count = resume_text.count('\t')
    if pipe_count > 15 or tab_count > 10:
        score -= 15
        issues.append({
            "id": "table_delimiter_risk",
            "severity": "medium",
            "message": "High density of table/column delimiters detected. Many legacy ATS parsers jumble multi-column or table data into scrambled text."
        })
    else:
        passed.append("No disruptive table or multi-column delimiters detected")

    # 3. Contact Professionalism
    # Check email handle
    email_match = re.search(r'([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', resume_text)
    if email_match:
        handle, domain = email_match.group(1).lower(), email_match.group(2).lower()
        if any(unprof in handle for unprof in ["cool", "sexy", "gamer", "king", "queen", "killer", "rockstar", "shadow", "dude"]):
            score -= 15
            issues.append({
                "id": "unprofessional_email",
                "severity": "high",
                "message": f"Email '{email_match.group(0)}' uses an informal handle. Use a professional format like 'firstname.lastname@{domain}'."
            })
        else:
            passed.append(f"Professional email handle verified ({domain})")
    else:
        score -= 15
        issues.append({
            "id": "missing_email",
            "severity": "critical",
            "message": "No valid email address found in the resume header."
        })

    # Check phone
    phone_match = re.search(r'(?:\+?91[-.\s]?)?[6-9]\d{9}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', resume_text)
    if phone_match:
        passed.append("Valid candidate contact number detected")
    else:
        score -= 10
        issues.append({
            "id": "missing_phone",
            "severity": "high",
            "message": "No clear 10-digit mobile number found. Include your country code (e.g. +91)."
        })

    return {
        "score": min(100, max(25, score)),
        "word_count": word_count,
        "estimated_pages": 1 if word_count <= 620 else 2,
        "issues": issues,
        "passed": passed
    }


def run_fresher_audit(resume_text: str, parsed_structure: Optional[Dict[str, Any]] = None, doc_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main orchestrator for the Fresher-Specific Resume Audit Engine.
    Executes all 4 diagnostic pillars and calculates a weighted Fresher Readiness Score.
    """
    if not resume_text or not resume_text.strip():
        return {
            "fresher_score": 0,
            "readiness_verdict": "Empty Resume",
            "categories": {},
            "critical_fixes": ["Please provide a valid resume text."],
            "quick_wins": []
        }

    sections = {}
    contact = {}
    if parsed_structure and isinstance(parsed_structure, dict):
        sections = parsed_structure.get("sections", {})
        contact = parsed_structure.get("contact_details", {})

    # Run the 4 Pillars
    projects_result = audit_project_quality(sections.get("projects", ""), resume_text)
    links_result = audit_sections_and_links(resume_text, sections, contact)
    verbs_result = detect_action_verbs_and_weak_phrases(resume_text)
    layout_result = audit_ats_layout_and_formatting(resume_text, doc_metadata)

    # Weighted Overall Score
    # Projects: 35%, Links & Sections: 25%, Action Verbs: 20%, Layout: 20%
    overall_score = round(
        (projects_result["score"] * 0.35) +
        (links_result["score"] * 0.25) +
        (verbs_result["score"] * 0.20) +
        (layout_result["score"] * 0.20)
    )

    # Determine Readiness Verdict
    if overall_score >= 80:
        verdict = "Campus Placement Ready"
    elif overall_score >= 60:
        verdict = "Needs Polish"
    else:
        verdict = "High Rejection Risk"

    # Aggregate Critical Fixes and Quick Wins
    critical_fixes: List[str] = []
    quick_wins: List[str] = []

    all_issues = (
        projects_result["issues"] +
        links_result["issues"] +
        verbs_result["issues"] +
        layout_result["issues"]
    )

    for iss in all_issues:
        sev = iss.get("severity", "medium")
        msg = iss.get("message", "")
        if sev == "critical":
            critical_fixes.append(msg)
        elif sev == "high":
            if len(critical_fixes) < 3:
                critical_fixes.append(msg)
            else:
                quick_wins.append(msg)
        else:
            quick_wins.append(msg)

    # Ensure at least one tip if score is not perfect
    if not critical_fixes and overall_score < 90:
        critical_fixes.append("Add measurable metrics (numbers, % gains, users) to all project bullet points.")

    return {
        "fresher_score": overall_score,
        "readiness_verdict": verdict,
        "categories": {
            "project_quality": projects_result,
            "links_and_sections": links_result,
            "action_verbs": verbs_result,
            "ats_layout": layout_result
        },
        "critical_fixes": critical_fixes[:4],
        "quick_wins": quick_wins[:4]
    }
