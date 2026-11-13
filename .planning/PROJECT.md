# ResuMatch AI — Project Overview

## 1. Executive Summary

**ResuMatch AI** is a fresher-focused resume optimization and job compatibility platform built specifically for final-year students and 0-2 year graduates in India applying for first jobs, internships, and campus drives.

Instead of generic "enterprise ATS" jargon, ResuMatch acts as a knowledgeable, supportive senior who reviews and fixes your resume. It pairs our core **Hybrid Scoring Engine (40% Lexical + 60% Semantic)** with fresher-tailored diagnostics: project quality validation, weak verb detection, missing section audits (GitHub, LinkedIn), one-page ATS layout checks, grounded AI bullet point rewrites, and student-accessible micro-pricing (₹199 Sprint Pass / ₹499 Placement Season) with one-tap UPI checkout.

---

## 2. Positioning & Value Proposition

- **Target User**: Final-year college students and fresh graduates (0-2 years) in India, targeting software engineering, data analytics, product, and core engineering roles.
- **User Pain Points**:
  - No corporate work experience; resumes are heavy on academic projects, coursework, and certifications.
  - Resumes look identical to thousands of classmates.
  - High rejection rates with zero feedback from campus recruiters.
  - Inability to afford ₹1,500–₹3,000/month recurring subscriptions built for US executives.
- **Brand Promise**: *"Upload your resume, paste a job, and get a better resume in 2 minutes, built for freshers, priced for students."*
- **Brand Voice**: A supportive, practical senior giving honest, actionable advice. Drop all "patent-grade enterprise ATS" terminology.
- **Frozen Enterprise Features**: Multi-tenant workspaces, audit logs, and developer API keys are frozen from active development and hidden from consumer student onboarding.

---

## 3. High-Level Architecture (Fresher Platform)

```
┌────────────────────────────────────────────────────────┐
│               Client (React 19 + Vite)                 │
│  - No-Signup Instant Scan Landing Widget               │
│  - Fresher Analysis Dashboard (Project & Layout Check) │
│  - Grounded AI Bullet Rewriter & Job Tailoring Studio  │
│  - Fresher ATS Templates (PDF/DOCX) & Viral Scorecards │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JWT / Session Token
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend (FastAPI / Uvicorn)              │
│  - /api/analyze (Public & Auth, Rate Limited)          │
│  - /api/fresher: Project quality, weak verbs, layout   │
│  - /api/rewrite: Gemini bullet optimizer (metric prompts)│
│  - /api/billing: Razorpay UPI passes (₹199 / ₹499)     │
│  - /api/referrals: "Invite 3 friends, get 7 days free" │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     AI / NLP Services     │ │      Persistence Layer    │
│ - PyMuPDF & python-docx   │ │ - SQLAlchemy 2.0 ORM      │
│ - Sentence-Transformers   │ │ - PostgreSQL / Redis      │
│ - NLTK Stemming & Lexical │ │ - Alembic Migrations      │
│ - Google Gemini 1.5 Flash │ │ - Cloud Storage (S3 / R2) │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 4. Milestone History

### Milestone 1: Platform Core, Stabilization & Hardening [COMPLETED]
- **Phase 1**: Critical boot stabilization, newline-preserving text parser, scan quota enforcement.
- **Phase 2**: Database schema alignment, Alembic migration graph, multi-tenant context.
- **Phase 3**: Multi-cloud storage (S3/R2/local proxy), ReportLab PDF generation, shareable reports.
- **Phase 4**: Native Razorpay integration (orders, HMAC SHA-256 verification, webhooks, security guardrails).
- **Phase 5**: Production hardening: `run_in_threadpool` ML offloading, Redis embedding cache, `slowapi` rate limiting, Vitest test suite, and GitHub Actions CI.

### Milestone 2: Fresher-Focused Product Pivot & Campus Launch [ACTIVE]
- **Goal**: Re-orient ResuMatch around freshers in India with free no-signup scans, student-specific heuristics, anti-hallucination AI bullet rewrites, student micro-pricing, and campus distribution.
