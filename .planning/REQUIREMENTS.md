# ResuMatch AI — System Requirements

## 1. Functional Requirements (FR)

### Module 1: Document Ingestion & Hybrid Matching Engine
- **FR-ENG-01**: Parse PDF resumes using PyMuPDF and DOCX resumes using python-docx, preserving structure and newlines.
- **FR-ENG-02**: Extract applicant contact info (name, email, phone, LinkedIn, GitHub) and segment text into sections (Experience, Education, Skills, Projects).
- **FR-ENG-03**: Calculate a 40% lexical ATS compatibility score based on keyword frequency, unigrams/bigrams, and SpaCy phrase matching against job description text.
- **FR-ENG-04**: Calculate a 60% semantic similarity score using Sentence-Transformers (`all-MiniLM-L6-v2`) cosine similarity.
- **FR-ENG-05**: Extract missing required and optional skills from the job description not present in the candidate resume.
- **FR-ENG-06**: Provide AI-powered bullet point improvement suggestions using Google Gemini 1.5 Flash.
- **FR-ENG-07**: Generate branded PDF evaluation summary reports via ReportLab with streaming downloads.

### Module 2: Authentication & Multi-Tenancy
- **FR-AUTH-01**: Provide secure user registration and login with bcrypt password hashing and HS256 JWT tokens.
- **FR-AUTH-02**: Support Organization creation with multi-tenant data isolation.
- **FR-AUTH-03**: Enforce Role-Based Access Control (RBAC) with defined roles: `OWNER`, `ADMIN`, `RECRUITER`, `VIEWER`.
- **FR-AUTH-04**: Scope all resume uploads, scans, and candidate history to the active `organization_id`.

### Module 3: Team Collaboration & API Keys
- **FR-TEAM-01**: Allow organization owners/admins to invite team members and assign roles.
- **FR-TEAM-02**: Enable developers to generate, view, and revoke API keys (`rm_live_...` prefix) with SHA-256 hashed storage.
- **FR-TEAM-03**: Enforce rate limits and monthly quota consumption on API key endpoints.

### Module 4: Cloud Storage & Persistent Reports
- **FR-STOR-01**: Upload raw candidate resume files (PDF/DOCX) to AWS S3 or Cloudflare R2 object storage.
- **FR-STOR-02**: Store presigned temporary URLs or authenticated proxy downloads for stored resumes.
- **FR-STOR-03**: Persist generated PDF evaluation reports to object storage and save report records in the database with shareable links.

### Module 5: Subscriptions & Usage Quotas
- **FR-BILL-01**: Integrate Razorpay Orders / Checkout for monthly/annual SaaS tier subscriptions (Free, Pro, Enterprise).
- **FR-BILL-02**: Handle Razorpay webhooks (`payment.captured`, `order.paid`, `subscription.charged`, `subscription.cancelled`) with HMAC SHA-256 signature verification.
- **FR-BILL-03**: Verify Razorpay payment signatures (HMAC SHA-256) on client payment completion before activating subscription.
- **FR-BILL-04**: Enforce tier-based monthly scan limits (e.g., Free: 10 scans/month, Pro: 500 scans/month, Enterprise: Unlimited) without bypass loopholes.

---

## 2. Non-Functional Requirements (NFR)

### Security & Compliance
- **NFR-SEC-01**: Never store unhashed passwords or plain API keys.
- **NFR-SEC-02**: Validate file magic bytes (`%PDF-`, `PK\x03\x04`) on all uploads to prevent malicious file execution.
- **NFR-SEC-03**: Disable development mock routes (e.g., `/mock-upgrade`) in production environments.
- **NFR-SEC-04**: Enforce strict CORS policies and rate limiting across all public endpoints.

### Performance & Scalability
- **NFR-PERF-01**: Keep single resume hybrid analysis latency under 2.5 seconds on warm cache.
- **NFR-PERF-02**: In-process or Redis-backed embeddings caching to eliminate redundant vector inferences.
- **NFR-PERF-03**: Asynchronous background task delegation or thread offloading for heavy CPU/ML tasks to prevent blocking ASGI event loops.

### Reliability & Resilience
- **NFR-REL-01**: Provide fallback to CPU/ONNX or lexical-only scoring if ML model loading fails or external AI APIs timeout.
- **NFR-REL-02**: Implement transactional rollbacks on database errors with clear, structured JSON error responses.

### Testing & Maintainability
- **NFR-TEST-01**: Maintain unit test coverage for parser extractors, scoring logic, and auth helpers.
- **NFR-TEST-02**: Ensure all backend tests run cleanly via `pytest` without path manipulation workarounds.
- **NFR-TEST-03**: Introduce frontend automated component/integration testing (Vitest + React Testing Library).

---

## 3. Requirements Status Matrix

| ID | Title | Priority | Status | Phase / Milestone |
| :--- | :--- | :---: | :---: | :---: |
| **FR-ENG-01** | PDF / DOCX Parser Extraction | P0 | Needs Fix (whitespace bug) | Phase 1: Stabilization |
| **FR-ENG-02** | Contact Info & Section Segmentation | P0 | Needs Fix (segmentation broken) | Phase 1: Stabilization |
| **FR-ENG-03** | 40% Lexical ATS Keyword Scoring | P0 | Complete | Milestone 1 |
| **FR-ENG-04** | 60% Semantic Similarity Scoring | P0 | Complete | Milestone 1 |
| **FR-ENG-05** | Missing Skill Gap Identification | P1 | Complete | Milestone 1 |
| **FR-ENG-06** | Gemini AI Bullet Rewrites | P1 | Functional (needs tuning) | Milestone 2 |
| **FR-ENG-07** | ReportLab PDF Report Generation | P1 | Functional | Milestone 1 |
| **FR-AUTH-01**| JWT Authentication & Passwords | P0 | Functional | Milestone 1 |
| **FR-AUTH-02**| Organization Multi-Tenancy | P1 | Functional | Milestone 1 |
| **FR-AUTH-03**| RBAC Role Enforcement | P1 | In Progress | Milestone 2 |
| **FR-AUTH-04**| Org-Scoped Analysis History | P1 | Pending | Milestone 2 |
| **FR-TEAM-01**| Member Invitations & Management | P1 | Functional | Milestone 1 |
| **FR-TEAM-02**| API Key Lifecycle & Hashing | P1 | Functional | Milestone 1 |
| **FR-TEAM-03**| API Key Usage Limits & Quotas | P1 | In Progress | Milestone 2 |
| **FR-STOR-01**| S3/R2 Cloud File Uploads | P1 | Pending Integration | Milestone 2 |
| **FR-STOR-02**| Presigned Resume Downloads | P1 | Pending Integration | Milestone 2 |
| **FR-STOR-03**| Persistent Report Records | P2 | Pending | Milestone 2 |
| **FR-BILL-01**| Razorpay Orders & Checkout | P1 | Pending Integration | Phase 4: Razorpay |
| **FR-BILL-02**| Razorpay Webhook Handlers | P1 | Pending Integration | Phase 4: Razorpay |
| **FR-BILL-03**| Payment Signature Verification | P1 | Pending Integration | Phase 4: Razorpay |
| **FR-BILL-04**| Scan Quota Enforcement | P0 | Complete | Phase 1: Stabilization |

