# ResuMatch AI — Project State

## 1. Project Health & Status

- **Status**: Development
- **Milestone**: Milestone 2 — Fresher-Focused Product Pivot & Campus Launch [ACTIVE]
- **Active Phase**: Phase 9 — Fresher ATS Templates & Multi-Format Export (Ready to Plan)
- **Branch**: `phase-8`
- **Codebase Map**: Complete (7 documents in `.planning/codebase/`)
- **Planning Setup**: Complete (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`)

---

## 2. Immediate Priorities & Next Steps

1. **[P0] Plan Phase 9**: Run `/gsd-plan-phase 9` to design the 3-4 clean fresher resume templates, ReportLab PDF generator, and python-docx export pipeline.
2. **[P1] Merge Phase 8**: Merge `phase-8` into `main` after review.

---

## 3. Decision Log

- **2026-11-11: Full Codebase Mapping**: Executed `/gsd-map-codebase` producing 7 domain-specific documents (`STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md`).
- **2026-11-11: Brownfield Onboarding & Phase 1 Scope**: Ingested existing documentation (`system_design.md`, `project_analysis_and_roadmap.md`) and scoped Phase 1 strictly to resolving the P0 boot and parsing blockers before moving to multi-tenancy and billing.
- **2026-11-11: Database Strategy**: Standardized on PostgreSQL with SQLAlchemy 2.0 and Alembic migrations, deprecating legacy SQLite assumptions for production.
- **2026-11-12: Phase 1 Plans Created & Executed**: Resolved boot blocker, newline preservation in PDF/DOCX extractors, quota bypass in `analyze.py`, and verified lazy model loading. (4/4 UAT passed).
- **2026-11-12: Phase 2 Schema & Multi-Tenancy**: Aligned database models, generated migration `c1a9d8e7f6b5`, implemented `get_current_organization` / `TenantContext`, scoped queries to active org, and wired `AuditLog`. (5/5 UAT passed).
- **2026-11-12: Phase 3 Storage & Reports**: Integrated S3 presigned URLs with local proxy fallback in `storage.py`, connected file persistence in `analyze.py`, added authenticated resume downloads, and implemented ReportLab `reports_router`. (5/5 UAT passed).
- **2026-11-12: Phase 4 Razorpay Billing Pivot**: Swapped Stripe for Razorpay. Added `Payment` ledger, migration `d3e2f1a0b9c8`, `POST /api/billing/order` with RBAC, cryptographic HMAC SHA-256 verification in `/verify` and `/webhook`, and production guardrails. (5/5 UAT passed).
- **2026-11-13: Phase 5 Production Hardening & CI**: Offloaded ML inference to worker threads via `run_in_threadpool`, added `RedisEmbeddingCache` with in-memory fallback, wired `slowapi` rate limiting, configured Vite vendor chunking, setup Vitest component tests, and built `.github/workflows/ci.yml`. (4/4 UAT passed).
- **2026-11-13: Milestone 1 Completed & Merged**: Merged all 5 phases into `main` and resolved CI pipeline linting/pytest collection checks.
- **2026-11-13: Milestone 2 Initiated (Fresher-Focused Product Pivot)**: Repositioned ResuMatch AI around Indian students and freshers applying for campus placements, internships, and entry tech jobs. Defined 5 focused phases (Phases 6–10) covering no-signup free scans, fresher diagnostics, grounded AI bullet rewriter, ATS templates & exports, and student micro-pricing (₹199 / ₹499) with Razorpay UPI. Frozen enterprise workspaces from consumer flows.
- **2026-11-13: Phase 6 Completed (Student Landing & Instant Free Scan)**: Rebranded landing page copy with friendly senior voice, built live frictionless scan widget (`POST /api/analyze/public`), enforced 3-scan anonymous IP/session quota (HTTP 429), built viral social scorecard modal (`ScorecardModal.jsx`) with WhatsApp and LinkedIn sharing, added DPDP privacy guarantees, and verified with frontend Vitest/linting and backend pytest suite. (4/4 UAT passed).
- **2026-11-13: Phase 7 Completed (Fresher-Specific Resume Audit Engine)**: Built the 4-pillar Fresher Audit Engine (`fresher_auditor.py`) evaluating Project Quality (tech stacks, metrics, role), Missing Links/Sections (GitHub, LinkedIn, grouped skills, coursework), Action Verbs ("worked on" → active replacement verbs), and ATS Layout (1-page constraint, tables check). Built `FresherAuditPanel.jsx`, integrated into `ResultDisplay.jsx`, `LandingPage.jsx`, and `ScorecardModal.jsx`, and verified with 7/7 backend unit tests and 0-error frontend lint/build. (5/5 UAT passed).
- **2026-11-13: Phase 8 Completed (Grounded AI Bullet Rewriter & 1-Click Job Tailoring)**: Built `bullet_rewriter.py` with strict anti-hallucination guardrails and dynamic metric insertion placeholders (`[Add your metric: e.g. 500+ users / 35% speedup]`). Wired `POST /api/analyze/{id}/rewrite-bullet` and `POST /api/analyze/{id}/tailor` persisting new `ResumeVersion` records. Enforced daily per-user LLM call limits (NFR-COST-01). Created interactive `BulletRewriterModal.jsx` with real-time metric substitution and `JobTailorModal.jsx` with before/after diffs, and verified with 5/5 backend tests and 0-error frontend lint/build. (5/5 UAT passed).

---

## 4. Next Action

Plan Phase 7 via `/gsd-plan-phase 7`.
