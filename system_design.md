# ResuMatch AI — System Design Document

## 1. Project Overview

ResuMatch AI is a multi-tenant SaaS platform that performs hybrid ATS (Applicant Tracking System) compatibility scanning. It evaluates how well a candidate's resume matches a target job description by combining two NLP techniques:

- **Lexical analysis (40%)** — exact keyword and n-gram matching via `CountVectorizer`
- **Semantic analysis (60%)** — meaning-level similarity via transformer embeddings (`all-MiniLM-L6-v2`)

The platform supports PDF/DOCX ingestion, multi-organization team workspaces, role-based access control, developer API keys, Stripe billing, and AI-powered bullet-point rewrites via Gemini.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Vite + React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ LandingPage  │  │ AuthModal    │  │ Dashboard / Scanner   │  │
│  │ (public)     │  │ (JWT login)  │  │ / Team / API Keys     │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│         │                  │                      │              │
│         └──────────────────┴──────────────────────┘              │
│                    Axios HTTP Client                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (CORS-enabled)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI / Python)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  app.py                                                   │  │
│  │  - CORS Middleware                                        │  │
│  │  - Route Registration (auth, billing, analyze, teams)     │  │
│  │  - Startup Event (DB init)                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │                    │                    │             │
│  ┌──────┴──────┐   ┌────────┴────────┐   ┌──────┴──────┐     │
│  │ auth router │   │ billing router  │   │analyze router│    │
│  │ /auth/*     │   │ /billing/*      │   │ /api/analyze │    │
│  └─────────────┘   └─────────────────┘   └─────────────┘     │
│                           │                      │             │
│              ┌────────────┴────────────┐                       │
│              │   teams router           │                      │
│              │ /orgs /members /apikeys │                     │
│              └─────────────────────────┘                      │
│                           │                                    │
│  ┌────────────────────────┴─────────────────────────────────┐  │
│  │                    SERVICES LAYER                          │  │
│  │  ai_engine.py                                             │  │
│  │  - hybrid_match_score()                                   │  │
│  │  - analyze_resume_lexical()                               │  │
│  │  - semantic_similarity()                                  │  │
│  │  - extract_skills_and_entities()                          │  │
│  │  - BoundedEmbeddingCache (LRU, thread-safe)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                    │
│  ┌────────────────────────┴─────────────────────────────────┐  │
│  │                    UTILITIES LAYER                         │  │
│  │  pdf_parser.py  — PyMuPDF text extraction                 │  │
│  │  docx_parser.py — python-docx + table traversal           │  │
│  │  resume_parser.py — section segmentation + contact regex   │  │
│  │  auth_helper.py — JWT encode/decode, bcrypt, get_current_ │  │
│  │  db.py — SQLAlchemy engine, session factory               │  │
│  │  limiter.py — flask-limiter in-memory rate limits         │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                        │
│                                                                 │
│   ┌──────────────────┐      ┌─────────────────────────┐       │
│   │   SQLAlchemy ORM │◄────►│   PostgreSQL (prod)      │       │
│   │   models.py      │      │   SQLite (dev)           │       │
│   └──────────────────┘      └─────────────────────────┘       │
│          │                                                      │
│   ┌──────┴──────────────────────────────────────────────────┐  │
│   │ Prisma Schema (schema.prisma)                            │  │
│   │ — 13 models, multi-tenant with Organization tenancy     │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                         │
│                                                                 │
│   ┌──────────────┐   ┌────────────────┐   ┌─────────────────┐  │
│   │   Stripe     │   │  Gemini API    │   │  Sentence-Trans.│  │
│   │  (billing)   │   │  (AI rewrite)  │   │  (embeddings)   │  │
│   └──────────────┘   └────────────────┘   └─────────────────┘  │
│                          ▲                    ▲                  │
│                   (on-demand)           (on-demand)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Runtime** | React (Vite bundler) | 19.2 / 7.2 |
| **UI/Styling** | Tailwind CSS | 3.4 |
| **HTTP Client** | Axios | 1.13 |
| **Backend Framework** | FastAPI (Python) | 0.110 |
| **ASGI Server** | Uvicorn | 0.28 |
| **ORM** | SQLAlchemy 2.0 + Prisma schema | 2.0.28 |
| **Database (prod)** | PostgreSQL (via psycopg2) | — |
| **Database (dev)** | SQLite (self-contained) | — |
| **NLP / ML** | NLTK, scikit-learn, spaCy, HuggingFace Transformers | — |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` | ONNX fallback |
| **PDF Parser** | PyMuPDF | 1.23.8 |
| **DOCX Parser** | python-docx | 1.1.0 |
| **Auth** | PyJWT + bcrypt (passlib) | 2.8 / 1.7 |
| **Payments** | Stripe Python SDK | 7.11 |
| **PDF Reports** | ReportLab | 4.0.8 |
| **Rate Limiting** | flask-limiter (slowapi) | 0.1.9 |
| **Testing** | pytest | 7.4.3 / 9.0.2 |

---

## 4. Component Design

### 4.1 Frontend (`client/`)

| File | Responsibility |
|------|---------------|
| `App.jsx` | Root state container: auth, active tab, scanner, orgs, history, billing |
| `AuthModal.jsx` | Login / Register form with validation |
| `LandingPage.jsx` | Public landing hero and CTA |
| `JobTextArea.jsx` | Textarea input for job description |
| `ResumeDropzone.jsx` | Drag-and-drop + click file upload (PDF/DOCX) |
| `ResultDisplay.jsx` | Score visualization, missing keywords, parsed sections, PDF export, AI suggestions |
| `HistoryDrawer.jsx` | Scan history sidebar |
| `Header.jsx` | Navigation shell |
| `ScrollReveal.jsx` | Animation utility |

**State Management**: Local `useState` + `useEffect` hooks. Auth tokens and dark mode preference persisted in `localStorage`.

**Routing**: Single-page tab switcher (`activeTab` state: `dashboard`, `scanner`, `team`, `apikeys`).

### 4.2 Backend Routers

| Router | Prefix | Endpoints |
|--------|--------|-----------|
| `auth.py` | `/api` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /user/profile` |
| `billing.py` | `/api/billing` | `POST /checkout-session`, `POST /webhook`, `POST /mock-upgrade` |
| `analyze.py` | `/api` | `POST /analyze`, `GET /history`, `DELETE /history/{id}`, `POST /parse-pdf`, `GET /analyze/{id}/suggestions`, `GET /history/{id}/export`, `GET /health` |
| `teams.py` | `/api` | `GET /orgs`, `POST /orgs`, `GET /orgs/{id}/members`, `POST /orgs/{id}/members`, `DELETE /orgs/{id}/members/{id}`, `GET /apikeys`, `POST /apikeys`, `DELETE /apikeys/{id}` |

---

## 5. Data Model

### 5.1 Core Entities (Prisma schema / SQLAlchemy)

```
User (1) ──< (Membership) >── (1) Organization
                                    │
                          ┌─────────┴──────────┐
                          │                    │
                    (Workspace)          (Subscription)
                          │                    │
                    (Resume)            (JobDescription)
                          │                    │
                    (ResumeVersion)          │
                          │                    │
                    (Analysis) ◄─────────────┘
                          │
                    (Report)
```

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **User** | `id`, `email`, `passwordHash`, `name`, `industry`, `jobTitle`, `resumePreference` | Supports OAuth-only accounts (`passwordHash` nullable) |
| **Organization** | `id`, `name`, `slug` | Multi-tenant root entity |
| **Membership** | `userId`, `orgId`, `role` (OWNER/ADMIN/RECRUITER/VIEWER) | Unique composite key |
| **Workspace** | `orgId`, `name`, `description` | Logical grouping within org |
| **Resume** | `userId`, `orgId?`, `workspaceId?`, `title`, `isArchived` | User-owned, optionally org-shared |
| **ResumeVersion** | `resumeId`, `version`, `fileUrl`, `resumeText`, `parsedJson` | Immutable snapshot; `version` auto-incremented |
| **JobDescription** | `orgId?`, `workspaceId?`, `title`, `companyName`, `jobText`, `tags[]` | Can be org-level or personal |
| **Analysis** | `resumeId`, `resumeVersionId`, `jobDescriptionId`, `score`, `lexicalScore`, `semanticScore`, `missingKeywords[]`, `skillsGap{}`, `recommendations[]` | Core scan record |
| **Report** | `analysisIds[]`, `pdfUrl` | Grouped report bundle |
| **Subscription** | `orgId`, `stripeCustomerId`, `plan` (FREE/PRO/TEAM), `status` | One-per-org |
| **ApiKey** | `userId`, `keyPrefix`, `keyHash`, `rateLimit`, `scopes[]` | SHA-256 hashed; raw key returned once |
| **UsageLog** | `userId`, `endpoint`, `scansUsed` | Event sourcing for quota |
| **AuditLog** | `orgId`, `actorId`, `action`, `targetType`, `targetId`, `ipAddress`, `userAgent` | Compliance tracking |

### 5.2 Indexing Strategy

- `User.email` (unique)
- `Membership` — composite unique `(orgId, userId)`, index on `userId`
- `Resume` — index on `userId`, `organizationId`
- `ResumeVersion` — unique `(resumeId, version)`, index on `resumeId`
- `JobDescription` — index on `organizationId`
- `Analysis` — indexes on `resumeId`, `resumeVersionId`, `jobDescriptionId`
- `UsageLog` — composite index on `(userId, createdAt)`
- `Notification` — composite index on `(userId, isRead)`

---

## 6. NLP / ATS Pipeline Detail

### 6.1 Document Ingestion

**Supported formats**: PDF (`.pdf`), DOCX (`.docx`)

| File | Technique |
|------|-----------|
| `server/utils/pdf_parser.py` | PyMuPDF `page.get_text()` per page; whitespace collapse via `re.sub(r'\s+', ' ', text)` |
| `server/utils/docx_parser.py` | `python-docx` paragraphs + table cell traversal; same whitespace normalization |

**Validation**: Magic bytes checked (`%PDF`, `PK\x03\x04`) before parsing.

### 6.2 Structural Parsing

**File**: `server/utils/resume_parser.py`

**Section Segmentation** — state-machine approach:

```
for each line:
  1. Strip leading bullets: re.sub(r'^[\s\-\*•◦]+', '', line)
  2. Remove non-alpha: re.sub(r'[^a-zA-Z\s&]', '', line).lower()
  3. if cleaned in SECTION_HEADERS → switch current_section
  4. else → append line to sections[current_section]
```

`SECTION_HEADERS` maps 6 sections (`contact`, `skills`, `experience`, `education`, `projects`, `other`) to ~30 heading variants each.

**Contact Extraction** — regex:
- Email: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Phone: `(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]]\d{3}[-.\s]?\d{4}`
- LinkedIn: `(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+`

### 6.3 Lexical Analysis (`analyze_resume_lexical`)

**Preprocessing** (`clean_and_tokenize`):
```
text → collapse whitespace
     → re.sub(r'[^a-zA-Z0-9]', ' ', text).lower()
     → NLTK word_tokenize
     → PorterStemmer.stem()
     → Remove: NLTK stopwords ∪ CUSTOM_IGNORE set (~50 filler words)
```

**Vectorization**:
- `CountVectorizer(binary=True, ngram_range=(1, 2))`
- Captures unigrams + adjacent bigrams (e.g., `"rest api"`, `"unit testing"`)
- Binary presence/absence (no TF-IDF weighting)
- Cosine similarity → `[0, 100]`

**Skill & Entity Extraction**:
- SpaCy `en_core_web_sm` loaded lazily via `_init_spacy()` (thread-safe double-checked locking)
- `PhraseMatcher` over `COMMON_SKILLS` (~100 tech terms)
- NER labels: `ORG`, `PRODUCT`, `WORK_OF_ART`
- Fallback: regex word-set matching if SpaCy fails

**Missing Keyword Detection (tiered)**:
1. Skills absent from resume (PhraseMatcher results)
2. Entities absent from resume (if missing < 10 items)
3. Stem-gap fallback: compare all content words (>2 chars, not stopwords)

### 6.4 Semantic Analysis (`semantic_similarity`)

**Model**: `sentence-transformers/all-MiniLM-L6-v2` (384-dim)

**Loading strategy**:
1. Primary: PyTorch CPU (`AutoModel.from_pretrained`)
2. Fallback: ONNX Runtime via `optimum` (`ORTModelForFeatureExtraction`)

**Embedding pipeline**:
```
text → sent_tokenize() [max 20 sentences]
     → tokenizer(sentences, padding=True, truncation=True, return_tensors="pt")
     → model(**inputs).last_hidden_state
     → mean-pool over tokens per sentence → sentence_embeddings
     → mean-pool over all sentence_embeddings → final_embedding (384-dim)
```

**Caching**: Thread-safe BoundedLRU cache (128 entries), keys are `hash(text)`.

**Similarity**: Raw cosine (dot / L2 norms), clamped to `[0, 100]`.

### 6.5 Hybrid Scoring

```python
final_score = 0.4 * lexical_score + 0.6 * semantic_score
```

| Component | Weight | What It Measures |
|-----------|--------|------------------|
| Lexical | 40% | Exact keyword / n-gram overlap; hard skills |
| Semantic | 60% | Meaning-level alignment; synonyms, soft skills, context |

---

## 7. API Design

### 7.1 Public (Unauthenticated)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/analyze` | Submit resume + JD text; returns score + analysis |
| `POST` | `/api/parse-pdf` | Upload PDF/DOCX; returns extracted text |
| `GET` | `/api/health` | Health check + model status |

### 7.2 Authenticated

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/register` | Create account + personal org |
| `POST` | `/api/auth/login` | JWT login |
| `GET` | `/api/auth/me` | Current user profile |
| `PUT` | `/api/user/profile` | Update name, LinkedIn, industry, job title |
| `GET` | `/api/history` | List user's scan history |
| `DELETE` | `/api/history/{id}` | Delete analysis record |
| `GET` | `/api/analyze/{id}/suggestions` | AI bullet rewrites (Premium) |
| `GET` | `/api/history/{id}/export` | PDF report download |
| `GET` | `/api/orgs` | List user's organizations |
| `POST` | `/api/orgs` | Create organization |
| `GET` | `/api/orgs/{id}/members` | List org members |
| `POST` | `/api/orgs/{id}/members` | Invite member |
| `DELETE` | `/api/orgs/{id}/members/{id}` | Remove member |
| `GET` | `/api/apikeys` | List API keys |
| `POST` | `/api/apikeys` | Generate API key |
| `DELETE` | `/api/apikeys/{id}` | Revoke API key |
| `POST` | `/api/billing/checkout-session` | Stripe checkout |
| `POST` | `/api/billing/webhook` | Stripe event webhook |
| `POST` | `/api/billing/mock-upgrade` | Test upgrade without Stripe |

---

## 8. Authentication & Authorization

### 8.1 JWT Authentication

- **Algorithm**: HS256
- **Expiry**: 7 days
- **Secret**: `SECRET_KEY` env var (dev fallback: `dev-secret-key-resumatch-9821`)
- **Header format**: `Authorization: Bearer <token>`
- **Password hashing**: bcrypt via passlib

### 8.2 Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| `OWNER` | Full org control; can remove owners/admins |
| `ADMIN` | Invite/remove members; manage org resources |
| `RECRUITER` | Run and delete analyses |
| `VIEWER` | Read-only access to reports |

**Implementation**: Each protected endpoint calls `get_current_user` (JWT validation + DB lookup). Team endpoints add role checks on `Membership.role`.

**Optional auth**: `get_current_user_optional` allows unauthenticated access to `/api/analyze` (returns result but does not persist).

---

## 9. Multi-Tenancy Model

ResuMatch uses **organization-level multi-tenancy**:

1. Every user is auto-created with a personal `Organization` and `OWNER` membership
2. Users can belong to multiple organizations via `Membership`
3. Subscriptions (`FREE` / `PRO` / `TEAM`) are per-organization, not per-user
4. Resumes and Job Descriptions can be scoped to user, org, or workspace level
5. `is_premium` is computed dynamically: `any(membership.organization.subscription.plan in [PRO, TEAM])`

---

## 10. Quotas & Rate Limiting

| Feature | Free Tier | Premium (PRO/TEAM) |
|---------|-----------|-------------------|
| **Scans per period** | 10 total (DB-counted per resume) | 1000+ (no hard limit) |
| **AI Suggestions** | Locked (blurred UI) | Unlocked (Gemini API) |
| **API Keys** | 1 max | Unlimited |
| **API Rate Limit** | 100 req/min | 1000 req/min |

**Global rate limiting** (`limiter.py`): `200 per day`, `50 per hour` via `flask_limiter` with in-memory storage.

**Enforcement**: Free tier scan limit checked in `analyze.py` before creating `Analysis` record.

---

## 11. External Integrations

### 11.1 Stripe (Billing)

- **Endpoints**: `POST /billing/checkout-session`, `POST /billing/webhook`
- **Flow**: Create `stripe.checkout.Session` → redirect → webhook `checkout.session.completed` → update `Subscription` to `PRO`
- **Mock mode**: If `STRIPE_SECRET_KEY` is unset, returns mock URL; `/mock-upgrade` endpoint grants PRO without payment
- **Secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `CLIENT_URL`

### 11.2 Gemini API (AI Suggestions)

- **Endpoint**: `GET /analyze/{id}/suggestions`
- **Trigger**: Premium users only
- **Flow**: Construct prompt with resume + JD → POST to `generativelanguage.googleapis.com` → parse JSON/array response
- **Fallback**: Offline generator produces static suggestions based on missing keywords

### 11.3 Sentence Transformers (Embeddings)

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Inference**: PyTorch CPU (primary) or ONNX Runtime (fallback)
- **Caching**: BoundedLRU (128 entries) keyed by `hash(text)`

### 11.4 File Storage

- Currently stores `file_url` as `"database-direct"` (local DB placeholder)
- Architecture supports S3/R2 replacement via env-configurable storage backend

---

## 12. Database Configuration

**ORM**: SQLAlchemy 2.0 with declarative base (`server/models.py`)

**Schema source of truth**: `prisma/schema.prisma` (Prisma Client JS generated; SQLAlchemy models manually maintained)

**Connection** (`server/utils/db.py`):
- `DATABASE_URL` env var (default: `sqlite:///resumatch.db`)
- `pool_pre_ping=True` for connection health
- SQLite: `check_same_thread=False` for multithreading

**Initialization**: `init_db()` called on FastAPI startup event.

---

## 13. Infrastructure & Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                      SINGLE SERVER                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  uvicorn app:app --host 0.0.0.0 --port 5001          │  │
│  │  - CORS enabled                                       │  │
│  │  - In-memory rate limiting                            │  │
│  │  - ML models loaded at startup (lazy + fallback)      │  │
│  └───────────────────────────────────────────────────────┘  │
│                        │                                     │
│           ┌────────────┴────────────┐                       │
│           │                         │                        │
│      PostgreSQL / SQLite        ML Models                   │
│      (DATABASE_URL)             (in-process)                │
└─────────────────────────────────────────────────────────────┘
```

**Environment variables required**:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | DB connection string |
| `SECRET_KEY` | JWT signing key |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `STRIPE_PRICE_ID` | Stripe price ID for PRO plan |
| `CLIENT_URL` | Frontend origin for Stripe redirects |
| `GEMINI_API_KEY` | Gemini API for AI suggestions |
| `FLASK_DEBUG` | Enable uvicorn reload |

**Procfile** (Heroku/Render deployment):
```
web: python app.py
```

---

## 14. Testing

| File | Coverage |
|------|----------|
| `server/tests/test_scoring.py` | Hybrid score unit tests (exact match, missing keywords, empty inputs, case insensitivity) |
| `server/tests/test_parser.py` | PDF/DOCX parsing edge cases |
| `server/tests/test_robustness.py` | Stress tests, error handling |

Test framework: `pytest`. Prisma schema test coverage included.

---

## 15. Error Handling & Resilience Patterns

| Pattern | Implementation |
|---------|--------------|
| **ML fallback** | Semantic model tries PyTorch, then ONNX; if both fail, `semantic_score = 0` and system falls back to lexical-only |
| **SpaCy fallback** | If `en_core_web_sm` fails to load/download, regex word matching against `COMMON_SKILLS` |
| **DB resilience** | `try/except` with `db.rollback()` on all mutation endpoints; analysis still returned even if save fails |
| **File validation** | Magic byte checks before parser invocation; graceful `RuntimeError` wrapping |
| **Empty input guards** | `hybrid_match_score("", "")` returns `0.0` safely (division-by-zero prevention) |
