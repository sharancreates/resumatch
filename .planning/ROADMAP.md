# ResuMatch AI — Development Roadmap

## Project Progress Overview

```
[Phase 1: Stabilization (P0)] ──► [Phase 2: Multi-Tenancy & Schema (P1)] ──► [Phase 3: Cloud Storage & Reports (P1)]
                                                                                       │
                                                                                       ▼
[Phase 5: Production Hardening & ML Async (P2)] ◄── [Phase 4: Stripe Billing Lifecycle (P1)]
```

---

## Phases & Milestones

### Phase 1: Critical Stabilization & P0 Bug Fixes [COMPLETED]
**Goal**: Resolve immediate showstoppers preventing backend execution, tests, and core resume parsing.
- [x] **Task 1.1**: Fix syntax error and unterminated string literal in `server/app.py` lines 48-50 so FastAPI can start.
- [x] **Task 1.2**: Fix whitespace collapse regex in `server/utils/pdf_parser.py` and `server/utils/docx_parser.py` to preserve newlines, restoring `resume_parser.py` section segmentation.
- [x] **Task 1.3**: Fix scan quota bypass in `server/routes/analyze.py` where `HTTPException(403)` is caught and suppressed by the generic `except Exception` handler.
- [x] **Task 1.4**: Update `server/requirements.txt` to include missing runtime and testing packages (`boto3`, `requests`, `alembic`, `pytest`, `httpx`).
- [x] **Task 1.5**: Verify full test suite passes with `pytest`.

### Phase 2: Schema Alignment & Multi-Tenant Context Scoping [COMPLETED]
**Goal**: Align database models and enforce strict organization-level data scoping.
- [x] **Task 2.1**: Synchronize `server/models.py` with `prisma/schema.prisma` (add `Report`, `UsageLog`, `AuditLog`, and resolve any deprecated `Workspace` remnants).
- [x] **Task 2.2**: Generate and verify Alembic migrations for new models and field updates.
- [x] **Task 2.3**: Implement FastAPI dependency to resolve and validate active `organization_id` header or session context.
- [x] **Task 2.4**: Scope all resume analysis queries, scan history listings, and deletions to the active organization.
- [x] **Task 2.5**: Wire audit logging on organization membership changes, API key operations, and quota updates.

### Phase 3: Cloud Storage Integration & Shareable Reports [COMPLETED]
**Goal**: Store real resume documents and persist shareable ATS evaluation reports.
- [x] **Task 3.1**: Connect `server/utils/storage.py` (AWS S3 / Cloudflare R2) to `server/routes/analyze.py` upload handlers, replacing the `"database-direct"` placeholder.
- [x] **Task 3.2**: Implement secure presigned URL generation or authenticated stream proxy for resume downloads.
- [x] **Task 3.3**: Persist generated ReportLab PDF evaluations to cloud storage and create database records in `Report`.
- [x] **Task 3.4**: Build shareable public/restricted report link endpoints (`/api/reports/{report_id}`).

### Phase 4: Razorpay Billing Lifecycle & Access Guardrails
**Goal**: Complete SaaS billing automation via Razorpay (orders, verification, webhooks) and eliminate security bypasses.
- [ ] **Task 4.1**: Align database models and migrations for Razorpay (update `Subscription` with Razorpay fields, add `Payment` model).
- [ ] **Task 4.2**: Implement Razorpay Order creation (`POST /api/billing/order`) and payment signature verification (`POST /api/billing/verify`) with HMAC SHA-256.
- [ ] **Task 4.3**: Handle Razorpay webhook events (`payment.captured`, `order.paid`, `subscription.charged`, `subscription.cancelled`) with `X-Razorpay-Signature` validation.
- [ ] **Task 4.4**: Enforce RBAC guardrails (`OWNER` or `ADMIN` only) on billing operations.
- [ ] **Task 4.5**: Guard or eliminate `/mock-upgrade` in production environments; enforce production JWT secret security.

### Phase 5: Production Hardening, Caching & ML Concurrency
**Goal**: Scale throughput, optimize latency, and prepare for high-concurrency production deployments.
- [ ] **Task 5.1**: Offload heavy Sentence-Transformers CPU/GPU inference from ASGI event loop using threadpool offloading (`run_in_threadpool`) or dedicated worker service.
- [ ] **Task 5.2**: Transition in-memory `slowapi` rate limiting and `BoundedEmbeddingCache` to a distributed Redis backend.
- [ ] **Task 5.3**: Optimize client bundle and configure frontend automated tests (Vitest + React Testing Library).
- [ ] **Task 5.4**: Set up GitHub Actions CI workflow for automated linting and test runs.
