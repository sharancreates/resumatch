# ResuMatch AI — Project Overview

## 1. Executive Summary

**ResuMatch AI** is a multi-tenant SaaS Applicant Tracking System (ATS) optimization and resume compatibility evaluation platform. It analyzes resumes against target job descriptions using a hybrid scoring model combining:
- **Lexical Keyword Matching (40%)**: Exact match and n-gram overlap via Scikit-Learn `CountVectorizer` and SpaCy entity/phrase matching.
- **Semantic Vector Similarity (60%)**: Deep semantic understanding via Sentence-Transformers (`all-MiniLM-L6-v2`) embeddings with cosine similarity.

Beyond scoring, ResuMatch AI provides automated skill gap identification, AI-powered resume bullet rewrites via Google Gemini 1.5 Flash, dynamically styled PDF exports via ReportLab, team multi-tenancy with RBAC, API key lifecycle management, and Stripe subscription billing.

---

## 2. Core Value Proposition & Target Users

- **Job Seekers**: Upload existing resumes (PDF/DOCX) and target job specs to get actionable ATS match scores, missing keyword suggestions, and AI-optimized bullet points before applying.
- **Recruiters & Staffing Agencies**: Bulk scan resumes against job requirements, manage candidates within organization workspaces, export branded ATS reports, and collaborate with team members across defined roles (`OWNER`, `ADMIN`, `RECRUITER`, `VIEWER`).
- **Developers / Integrators**: Programmatically evaluate resumes via SHA-256 authenticated REST API keys with tiered usage limits.

---

## 3. High-Level System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Client (React 19 + Vite)                 │
│  - Landing Page, Auth Modals, Analysis Dashboard       │
│  - Scanner Dropzone, Results View, Team & API Key Mgmt │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JWT / API Key
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend (FastAPI / Uvicorn)              │
│  - /auth: Authentication & JWT issuance (bcrypt, HS256)│
│  - /api/analyze: Resume parsing, scoring, PDF export   │
│  - /api/teams: Organizations, RBAC, API key lifecycle  │
│  - /api/billing: Stripe checkout sessions & webhooks   │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     AI / NLP Services     │ │      Persistence Layer    │
│ - PyMuPDF & python-docx   │ │ - SQLAlchemy 2.0 ORM      │
│ - Sentence-Transformers   │ │ - PostgreSQL / SQLite     │
│ - SpaCy en_core_web_sm    │ │ - Alembic Migrations      │
│ - Google Gemini 1.5 Flash │ │ - Cloud Storage (S3 / R2) │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 4. Key Architectural Decisions & Baseline State

| Area | Chosen Solution | Status / Current Baseline |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (ASGI) | Migrated from Flask. Active P0 syntax error in `server/app.py` line 48 needs resolution. |
| **Frontend Framework** | React 19 + Tailwind CSS + Lucide React | Functional SPA with dark/light themes, tabs for scanner, history, teams, and API keys. |
| **Database & ORM** | PostgreSQL with SQLAlchemy 2.0 | Alembic initialized; schemas partially aligned with `prisma/schema.prisma`. |
| **File Storage** | AWS S3 / Cloudflare R2 | `server/utils/storage.py` utility built; endpoint integration pending. |
| **Embeddings Cache** | Bounded LRU Cache (`BoundedEmbeddingCache`) | In-process thread-safe cache active; future Redis decoupling planned for multi-worker scaling. |
| **Billing** | Stripe Billing API | Checkout sessions and webhook stub implemented; customer portal & tiered enforcement in progress. |

---

## 5. Critical Issues & Immediate Focus (Baseline Findings)

From the codebase mapping audit:
1. **P0 Boot Blocker**: Syntax error in `server/app.py` lines 48-50 (`'t"]`) prevents backend boot and test execution.
2. **P0 Section Parsing Bug**: PDF/DOCX extractors collapse all whitespace (including newlines) with `\s+`, breaking line-based section segmentation in `resume_parser.py`.
3. **P0 Quota Bypass**: Exception handler in `analyze.py` catches `HTTPException(403)` on scan limit checks and continues processing scans.
4. **P1 Schema Alignment**: Sync remaining models (`Report`, `Payment`, `AuditLog`, `UsageLog`) between SQLAlchemy and database migrations.

