# ResuMatch AI — System Requirements

## 1. Functional Requirements (FR)

### Milestone 1: Platform Core, Stabilization & Hardening [COMPLETED]
- **FR-ENG-01**: Parse PDF resumes using PyMuPDF and DOCX resumes using python-docx, preserving structure and newlines. *(Passed)*
- **FR-ENG-02**: Extract applicant contact info (name, email, phone, LinkedIn, GitHub) and segment text into sections. *(Passed)*
- **FR-ENG-03**: Calculate a 40% lexical ATS compatibility score based on keyword frequency against job description text. *(Passed)*
- **FR-ENG-04**: Calculate a 60% semantic similarity score using Sentence-Transformers (`all-MiniLM-L6-v2`) cosine similarity. *(Passed)*
- **FR-ENG-05**: Extract missing required and optional skills from the job description not present in the resume. *(Passed)*
- **FR-ENG-06**: Provide AI-powered bullet point improvement suggestions using Google Gemini 1.5 Flash. *(Passed)*
- **FR-ENG-07**: Generate branded PDF evaluation summary reports via ReportLab with streaming downloads. *(Passed)*
- **FR-AUTH-01**: Provide secure user registration and login with bcrypt password hashing and HS256 JWT tokens. *(Passed)*
- **FR-AUTH-02**: Support Organization creation with multi-tenant data isolation. *(Passed)*
- **FR-AUTH-03**: Enforce Role-Based Access Control (RBAC) with defined roles: `OWNER`, `ADMIN`, `RECRUITER`, `VIEWER`. *(Passed)*
- **FR-AUTH-04**: Scope all resume uploads, scans, and candidate history to the active `organization_id`. *(Passed)*
- **FR-STOR-01**: Upload raw candidate resume files (PDF/DOCX) to AWS S3 or Cloudflare R2 object storage with local disk fallback. *(Passed)*
- **FR-STOR-02**: Store presigned temporary URLs or authenticated proxy downloads for stored resumes. *(Passed)*
- **FR-STOR-03**: Persist generated PDF evaluation reports to object storage and save report records with shareable links. *(Passed)*
- **FR-BILL-01**: Integrate Razorpay Orders / Checkout for ₹499 PRO upgrade. *(Passed)*
- **FR-BILL-02**: Handle Razorpay webhooks (`payment.captured`, `order.paid`, `subscription.cancelled`) with HMAC SHA-256 verification. *(Passed)*
- **FR-BILL-03**: Verify Razorpay payment signatures (HMAC SHA-256) on client payment completion before activating upgrade. *(Passed)*
- **FR-BILL-04**: Enforce tier-based scan limits without bypass loopholes. *(Passed)*

---

### Milestone 2: Fresher-Focused Product Pivot & Campus Launch [ACTIVE]

#### Module 6: Student Landing Experience & Instant Free Scan
- **FR-FRESH-01**: Provide a frictionless free scan widget on the landing page (resume upload + JD paste -> match score + top 3 missing skills) with zero signup required, tracked by IP/session with a 3-scan limit.
- **FR-FRESH-02**: Generate visual, branded resume scorecards optimized for one-click sharing on LinkedIn, WhatsApp student groups, and Reddit with referral links.

#### Module 7: Fresher-Specific Resume Audit Engine
- **FR-FRESH-03**: Project Quality Checker: Inspect each project for explicit tech stack tags, role clarity, and measurable impact/metrics.
- **FR-FRESH-04**: Missing Sections & Link Auditor: Detect presence of GitHub, LinkedIn, coursework, technical skills groupings, and certification prominence.
- **FR-FRESH-05**: Action Verb & Weak Phrasing Highlighter: Flag weak, passive phrases ("worked on", "assisted with", "responsible for") and recommend assertive verbs ("built", "architected", "deployed").
- **FR-FRESH-06**: ATS-Safe 1-Page Layout Validator: Check for single-page length, table misuse, multi-column blocks, photos, and non-standard headings that break parsers.

#### Module 8: Grounded AI Bullet Rewriter & Job Tailoring
- **FR-FRESH-07**: Grounded AI Bullet Rewriter: Rewrite resume bullet points to naturally incorporate target JD keywords without fabricating experience or numbers; explicitly prompt the student: *"Add your actual metric here: users, % improvement, dataset size, latency reduction"*.
- **FR-FRESH-08**: "Tailor to this Job": One-click generation of tailored resume versions linked to specific job descriptions with historical version tracking.

#### Module 9: Fresher ATS Templates & Multi-Format Export
- **FR-FRESH-09**: Provide 3-4 clean, proven fresher resume templates optimized for Indian campus placements and tech hiring.
- **FR-FRESH-10**: Export tailored resumes in both ATS-styled PDF (ReportLab) and fully editable DOCX (`python-docx`).

#### Module 10: Student Micro-Pricing, UPI Razorpay & Referrals
- **FR-FRESH-11**: Implement student micro-purchase passes: Free (3 scans), Sprint Pass (₹199 / 14 days), Placement Season (₹499 / 3 months), and Campus bulk licensing.
- **FR-FRESH-12**: Support one-tap UPI intent and QR payment flows via Razorpay Checkout.
- **FR-FRESH-13**: Implement student referral mechanics: "Invite 3 friends -> unlock 7 days free Sprint Pass".

---

## 2. Non-Functional Requirements (NFR)

### Security & Privacy
- **NFR-SEC-01**: Never store unhashed passwords or plain API keys. *(Passed)*
- **NFR-SEC-02**: Validate file magic bytes (`%PDF-`, `PK\x03\x04`) on all uploads. *(Passed)*
- **NFR-SEC-03**: Disable development mock routes (`/mock-upgrade`) in production environments. *(Passed)*
- **NFR-SEC-04**: Enforce strict CORS policies and rate limiting across all public endpoints. *(Passed)*
- **NFR-PRIV-01**: Student Privacy & DPDP Act Compliance: One-click resume deletion, 30-day retention on free tier, encryption at rest, and explicit "no AI training on resumes" policy.

### Performance, Concurrency & Cost
- **NFR-PERF-01**: Keep single resume hybrid analysis latency under 2.5 seconds on warm cache. *(Passed)*
- **NFR-PERF-02**: Redis-backed embeddings caching to eliminate redundant vector inferences. *(Passed)*
- **NFR-PERF-03**: Non-blocking threadpool offloading (`run_in_threadpool`) for heavy CPU/ML tasks. *(Passed)*
- **NFR-COST-01**: LLM Cost Control: Cap daily Gemini API calls per student to ensure gross margins remain above 80%.

### Testing & Quality
- **NFR-TEST-01**: Maintain unit test coverage for parser extractors, scoring logic, and auth helpers. *(Passed)*
- **NFR-TEST-02**: Ensure all backend tests run cleanly via `pytest` without path manipulation workarounds. *(Passed)*
- **NFR-TEST-03**: Automated component/integration testing with Vitest and React Testing Library. *(Passed)*

---

## 3. Requirements Status Matrix

| ID | Title | Priority | Status | Phase / Milestone |
| :--- | :--- | :---: | :---: | :---: |
| **FR-ENG-01..07** | Core Ingestion, Hybrid 40/60 & Reports | P0 | Complete | Milestone 1 |
| **FR-AUTH-01..04**| Authentication & Multi-Tenancy | P0 | Complete | Milestone 1 |
| **FR-STOR-01..03**| Cloud Storage & Report Records | P1 | Complete | Milestone 1 |
| **FR-BILL-01..04**| Razorpay Billing & Guardrails | P0 | Complete | Milestone 1 |
| **FR-FRESH-01** | Frictionless No-Signup Free Scan | P0 | Planned | Phase 6: Student Landing & Scan |
| **FR-FRESH-02** | Viral Shareable Scorecards | P1 | Planned | Phase 6: Student Landing & Scan |
| **FR-FRESH-03** | Fresher Project Quality Checker | P0 | Planned | Phase 7: Fresher Audit Engine |
| **FR-FRESH-04** | Missing Sections & Link Auditor | P0 | Planned | Phase 7: Fresher Audit Engine |
| **FR-FRESH-05** | Action Verb & Weak Phrase Detector | P1 | Planned | Phase 7: Fresher Audit Engine |
| **FR-FRESH-06** | ATS 1-Page Layout Validator | P0 | Planned | Phase 7: Fresher Audit Engine |
| **FR-FRESH-07** | Grounded AI Bullet Rewriter | P0 | Planned | Phase 8: AI Bullet Rewriter |
| **FR-FRESH-08** | 1-Click Job Tailoring & Versions | P1 | Planned | Phase 8: AI Bullet Rewriter |
| **FR-FRESH-09** | Fresher ATS Templates (3-4 styles) | P0 | Planned | Phase 9: Templates & Exports |
| **FR-FRESH-10** | Dual PDF & DOCX Export Pipeline | P0 | Planned | Phase 9: Templates & Exports |
| **FR-FRESH-11** | Student Micro-Pricing (₹199 / ₹499) | P0 | Planned | Phase 10: UPI & Student Pricing |
| **FR-FRESH-12** | Razorpay UPI One-Tap Checkout | P0 | Planned | Phase 10: UPI & Student Pricing |
| **FR-FRESH-13** | Student Referral Engine (3 Friends) | P1 | Planned | Phase 10: UPI & Student Pricing |
| **NFR-PRIV-01** | Student Privacy & DPDP Compliance | P0 | Planned | Phase 6: Student Landing & Scan |
| **NFR-COST-01** | LLM Cost & Rate Guardrails | P0 | Planned | Phase 8: AI Bullet Rewriter |
