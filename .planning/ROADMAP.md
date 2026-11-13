# ResuMatch AI — Development Roadmap

## Project Progress Overview

```
[Milestone 1: Platform Core & Hardening (Phases 1-5)] ──► [COMPLETED]
                                                              │
                                                              ▼
[Phase 6: Student Landing & Free Scan] [COMPLETED] ──► [Phase 7: Fresher Audit Engine] ──► [Phase 8: AI Bullet Rewriter]
                                                                                                    │
                                                                                                    ▼
[Phase 10: UPI & Student Micro-Pricing] ◄── [Phase 9: Fresher ATS Templates & Exports] ◄───────────┘
```

---

## Milestone 1: Platform Core, Stabilization & Hardening [COMPLETED]

### Phase 1: Critical Stabilization & P0 Bug Fixes [COMPLETED]
- [x] **Task 1.1**: Fix syntax error and unterminated string literal in `server/app.py` lines 48-50 so FastAPI can start.
- [x] **Task 1.2**: Fix whitespace collapse regex in `server/utils/pdf_parser.py` and `server/utils/docx_parser.py` to preserve newlines, restoring `resume_parser.py` section segmentation.
- [x] **Task 1.3**: Fix scan quota bypass in `server/routes/analyze.py` where `HTTPException(403)` is caught and suppressed.
- [x] **Task 1.4**: Update `server/requirements.txt` to include missing runtime and testing packages.
- [x] **Task 1.5**: Verify full test suite passes with `pytest`.

### Phase 2: Schema Alignment & Multi-Tenant Context Scoping [COMPLETED]
- [x] **Task 2.1**: Synchronize `server/models.py` with `prisma/schema.prisma` (add `Report`, `UsageLog`, `AuditLog`, purge `Workspace`).
- [x] **Task 2.2**: Generate and verify Alembic migrations for new models and field updates.
- [x] **Task 2.3**: Implement FastAPI dependency to resolve and validate active `organization_id` header or session context.
- [x] **Task 2.4**: Scope all resume analysis queries, scan history listings, and deletions to the active organization.
- [x] **Task 2.5**: Wire audit logging on organization membership changes, API key operations, and quota updates.

### Phase 3: Cloud Storage Integration & Shareable Reports [COMPLETED]
- [x] **Task 3.1**: Connect `server/utils/storage.py` (AWS S3 / Cloudflare R2) to `server/routes/analyze.py` upload handlers.
- [x] **Task 3.2**: Implement secure presigned URL generation or authenticated stream proxy for resume downloads.
- [x] **Task 3.3**: Persist generated ReportLab PDF evaluations to cloud storage and create database records in `Report`.
- [x] **Task 3.4**: Build shareable public/restricted report link endpoints (`/api/reports/{report_id}`).

### Phase 4: Razorpay Billing Lifecycle & Access Guardrails [COMPLETED]
- [x] **Task 4.1**: Align database models and migrations for Razorpay (update `Subscription` with Razorpay fields, add `Payment` model).
- [x] **Task 4.2**: Implement Razorpay Order creation (`POST /api/billing/order`) and payment signature verification (`POST /api/billing/verify`) with HMAC SHA-256.
- [x] **Task 4.3**: Handle Razorpay webhook events (`payment.captured`, `order.paid`, `subscription.charged`, `subscription.cancelled`) with `X-Razorpay-Signature` validation.
- [x] **Task 4.4**: Enforce RBAC guardrails (`OWNER` or `ADMIN` only) on billing operations.
- [x] **Task 4.5**: Guard or eliminate `/mock-upgrade` in production environments; enforce production JWT secret security.

### Phase 5: Production Hardening, Caching & ML Concurrency [COMPLETED]
- [x] **Task 5.1**: Offload heavy Sentence-Transformers CPU/GPU inference from ASGI event loop using threadpool offloading (`run_in_threadpool`).
- [x] **Task 5.2**: Transition in-memory `slowapi` rate limiting and `BoundedEmbeddingCache` to a distributed Redis backend with fallback.
- [x] **Task 5.3**: Optimize client bundle and configure frontend automated tests (Vitest + React Testing Library).
- [x] **Task 5.4**: Set up GitHub Actions CI workflow for automated linting and test runs.

---

## Milestone 2: Fresher-Focused Product Pivot & Campus Launch [ACTIVE]

### Phase 6: Student Landing Experience & Instant Free Scan [COMPLETED]
**Goal**: Reposition brand around Indian freshers and offer a zero-friction, no-login scan engine with viral shareable scorecards.
- [x] **Task 6.1**: Rewrite frontend landing page copy, headings, and value proposition with student-first senior voice; drop enterprise ATS claims.
- [x] **Task 6.2**: Implement anonymous, no-signup free scan flow (`POST /api/analyze/public`) tracking IP/session state with a 3-scan limit.
- [x] **Task 6.3**: Build quick-view result card displaying overall match score and top 3 critical skill gaps.
- [x] **Task 6.4**: Build visual, branded resume scorecard generator optimized for WhatsApp and LinkedIn sharing with embedded referral parameters.
- [x] **Task 6.5**: Add DPDP-compliant privacy policy, "we never train on your resume" pledge, and 30-day retention policies for free scans.

### Phase 7: Fresher-Specific Resume Audit Engine
**Goal**: Build deeper diagnostic tools tailored specifically to students and early-career job applicants.
- [ ] **Task 7.1**: Build Project Quality Checker: Analyze projects for explicit tech stack, personal contribution, and measurable metrics.
- [ ] **Task 7.2**: Build Missing Sections & Links Auditor: Verify presence and validity of GitHub, LinkedIn, coursework, and technical skills grouping.
- [ ] **Task 7.3**: Build Action Verb & Weak Phrase Detector: Flag passive language ("worked on", "assisted") and recommend active impact verbs.
- [ ] **Task 7.4**: Build ATS Layout & Readability Validator: Warn against tables, multi-column blocks, photos, and non-standard headings, while enforcing single-page constraints.
- [ ] **Task 7.5**: Integrate fresher diagnostics directly into the analysis report UI with actionable pill badges and one-click fix prompts.

### Phase 8: Grounded AI Bullet Rewriter & 1-Click Job Tailoring
**Goal**: Transform weak bullets into ATS-optimized points with strict anti-hallucination guardrails and job-specific versioning.
- [ ] **Task 8.1**: Implement Gemini 1.5 Flash bullet rewriter prompt with strict anti-hallucination guardrails (prompting the user for their actual metrics: users, %, dataset size).
- [ ] **Task 8.2**: Build interactive bullet rewriter UI allowing line-by-line review, metric insertion, and instant keyword insertion.
- [ ] **Task 8.3**: Implement "Tailor to this Job": 1-click generation of tailored resume versions linked to target job descriptions.
- [ ] **Task 8.4**: Implement per-user and daily LLM quota enforcement to guarantee cost control and gross margin protection.

### Phase 9: Fresher ATS Templates & Multi-Format Export
**Goal**: Provide clean, campus-tested resume templates with instant export in styled PDF and editable DOCX formats.
- [ ] **Task 9.1**: Design 3-4 clean, single-page fresher resume templates (Classic Tech, Modern Minimal, Data/Analytics, Campus Placement).
- [ ] **Task 9.2**: Build ReportLab PDF generator pipeline rendering tailored resumes onto the chosen template.
- [ ] **Task 9.3**: Build `python-docx` export generator producing clean, ATS-compliant Word documents without formatting traps.
- [ ] **Task 9.4**: Connect client download modal supporting both PDF and DOCX exports for tailored resumes.

### Phase 10: Student Micro-Pricing, UPI Razorpay & Viral Referrals
**Goal**: Replace recurring monthly subscriptions with student-friendly micro-passes and viral referral mechanics.
- [ ] **Task 10.1**: Update database schemas for student passes: Sprint Pass (₹199 / 14 days), Placement Season (₹499 / 3 months), and Campus Bulk Licenses.
- [ ] **Task 10.2**: Implement Razorpay UPI Intent & QR payment integration for friction-free mobile student checkout.
- [ ] **Task 10.3**: Implement student referral engine ("Invite 3 friends -> unlock 7 days free Sprint Pass") with referral codes and activation webhooks.
- [ ] **Task 10.4**: Hide enterprise multi-tenant workspaces and API keys from student onboarding to keep UX simple and focused.
