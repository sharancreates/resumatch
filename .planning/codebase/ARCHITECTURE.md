# Architecture Documentation — ResuMatch AI

This document provides a comprehensive architectural breakdown of **ResuMatch AI**, a hybrid Applicant Tracking System (ATS) resume scanner and multi-tenant SaaS platform. It covers the end-to-end system topology, component interactions, data flow, scoring pipeline, database modeling, and key design decisions.

---

## 1. High-Level System Overview

ResuMatch AI is structured as a decoupled client-server architecture consisting of a modern single-page frontend application (SPA), an asynchronous REST API backend in Python, and persistent relational data storage.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (SPA)                              │
│  React 19 + Vite 7 + Tailwind CSS 3.4                                 │
│  - Public Landing Page with interactive client-side sandbox teaser    │
│  - Authenticated Workspaces (Dashboard, Scanner, Team, API Keys)       │
│  - History Drawer & Auth Modal                                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JSON + multipart)
                                    │ Bearer JWT Authentication
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY & ROUTING                           │
│  FastAPI (ASGI) + Uvicorn                                              │
│  - CORS Middleware (origins controlled via ALLOWED_ORIGINS)            │
│  - Route Submodules: /api/auth, /api/analyze, /api/billing, /api/orgs  │
│  - Dependency Injection (Database sessions, Auth token resolution)     │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼                               ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│          BUSINESS LOGIC & ML         │  │     STORAGE & PERSISTENCE    │
│  - NLP Pipeline (NLTK, Scikit-learn) │  │  - SQLAlchemy 2.0 ORM        │
│  - spaCy PhraseMatcher & NER         │  │  - SQLite (dev) / PG (prod)  │
│  - Transformers / PyTorch Embeddings │  │  - Alembic Schema Migrations │
│  - In-memory LRU Embedding Cache     │  │  - S3 / R2 / Local Disk      │
│  - ReportLab PDF Generation Engine   │  └──────────────────────────────┘
└───────────────────┬──────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                           │
│  - Stripe Payments (Checkout sessions, webhooks, subscription sync)    │
│  - Google Gemini 1.5 Flash (AI bullet point rewrite suggestions)       │
│  - AWS S3 / Cloudflare R2 (Optional object storage for documents)      │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Architecture Components

| Layer | Technology | Primary Role |
| :--- | :--- | :--- |
| **Frontend Client** | React 19.2, Vite 7.2, Tailwind CSS 3.4, Axios | Single-page UI, responsive dashboard, real-time client validation, file drag-and-drop, theme switcher. |
| **Backend Framework** | FastAPI 0.110.0, Python 3.10+, Uvicorn 0.28.0 | High-performance ASGI REST API, route dispatching, request validation via Pydantic, dependency injection. |
| **Persistence / ORM** | SQLAlchemy 2.0.28, SQLite (dev), PostgreSQL (prod) | Object-relational mapping, tenant modeling, session lifecycle management (`get_db` generator). |
| **Schema Governance** | Prisma Schema (`prisma/schema.prisma`) & Alembic | Conceptual schema definition and database migration scripts (`server/alembic/`). |
| **Document Processing** | PyMuPDF (`fitz`), `python-docx` | Binary file extraction from PDF and DOCX, document header magic-byte validation. |
| **Lexical Engine** | NLTK 3.9.1, Scikit-Learn 1.3.2, spaCy 3.7.2 | Porter stemming, custom stop-word pruning, unigram/bigram vectorization, cosine similarity, skill PhraseMatcher. |
| **Semantic Engine** | Transformers 4.47.1, PyTorch / ONNX Runtime | Dense vector embeddings via `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions), cosine distance computation. |
| **Reporting Engine** | ReportLab 4.0.8 | Binary PDF compilation with structured styles, score tables, and actionable advice streamed via `StreamingResponse`. |
| **External Services** | Stripe API, Google Gemini 1.5 Flash, AWS S3/R2 | Billing and subscription state management, AI resume rewriting, persistent object storage. |

---

## 2. Component Architecture & Request Lifecycle

### 2.1 Backend Entry Point & Middleware Stack

The server enters execution at `server/app.py`.
- **Application Initialization**: Instantiates `FastAPI` with metadata.
- **CORS Middleware**: Restricts origins using the `ALLOWED_ORIGINS` environment variable (defaulting to `http://localhost:5173`). Permits credentials, wildcard methods, and wildcard headers.
- **Route Registration**:
  - `auth_router` (`/api/auth/*`, `/api/user/*`)
  - `analyze_router` (`/api/analyze`, `/api/history/*`, `/api/parse-pdf`, `/api/health`)
  - `billing_router` (`/api/billing/*`)
  - `teams_router` (`/api/orgs/*`, `/api/apikeys/*`)
- **Lifecycle Hook**: `@app.on_event("startup")` executes `init_db()` from `utils.db`, invoking `Base.metadata.create_all()` against the active engine.

```
Incoming Request
       │
       ▼
[CORS Middleware]
       │
       ▼
[Route Router Matching (/api/*)]
       │
       ▼
[FastAPI Dependency Injection]
   ├── get_db() -> SQLAlchemy Session
   └── get_current_user() / get_current_user_optional() -> Decodes JWT, fetches User
       │
       ▼
[Endpoint Controller Handler]
   ├── Request validation (Pydantic models / UploadFile magic bytes)
   ├── Service invocations (ai_engine, parsers, storage)
   └── Database commits / rollbacks
       │
       ▼
[Response serialization (JSON / StreamingResponse)]
```

### 2.2 Resume Parsing & Matching Pipeline

The core differentiator of ResuMatch AI is its two-phase hybrid matching engine combining **lexical keyword match (40%)** with **semantic meaning matching (60%)**.

```
                           [Document Upload: PDF / DOCX]
                                         │
                                         ▼
                            [Magic Byte Verification]
                            - PDF signature: %PDF (0x25 0x50 0x44 0x46)
                            - DOCX signature: PK\x03\x04
                                         │
                                         ▼
                            [Text Extraction Layer]
                            - PyMuPDF fitz.open(stream) for PDF
                            - python-docx Document(stream) for DOCX
                                         │
                                         ▼
                             [Structural Segmenter]
                             - Sections: Contact, Skills, Experience, Education, Projects
                             - Regex: Email, Phone, LinkedIn
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
      [Lexical Analysis (Weight: 40%)]        [Semantic Analysis (Weight: 60%)]
      - Text normalization & clean            - Sentence tokenization (max 20)
      - Porter Stemmer & Custom Stopwords     - Bounded LRU Embedding Cache lookup
      - Scikit-learn CountVectorizer          - MiniLM-L6-v2 (PyTorch / ONNX)
        (Unigrams & Bigrams, Binary)          - 384-dimensional vector pooling
      - Cosine Similarity                     - Cosine Similarity across embeddings
      - spaCy PhraseMatcher (70+ skills)      
      - Named Entity Recognition (NER)        
                     │                                       │
                     └───────────────────┬───────────────────┘
                                         ▼
                        [Hybrid Score Computation]
              Score = (0.40 * LexicalScore) + (0.60 * SemanticScore)
                                         │
                                         ▼
                        [Skills Gap & Missing Entities]
                        - Skills present in Job Description
                        - Missing skills / technology entities
                                         │
                                         ▼
                        [Persistence & User Accounting]
                        - Resume container check
                        - ResumeVersion snapshot
                        - JobDescription log
                        - Analysis record with scores & JSON gaps
                        - Free tier limit check (< 10 scans for non-premium)
```

#### Pipeline Details
1. **Magic Byte Verification**: When uploading via `/api/parse-pdf`, raw file bytes are inspected before invoking heavier parser libraries. Prevents malicious or corrupted binary uploads.
2. **Text Normalization**: Strips excessive whitespace, non-alphanumeric characters, and carriage returns.
3. **Lexical Matching**:
   - Stop-word list combines NLTK English stop words with `CUSTOM_IGNORE` containing common job description boilerplate terms (e.g., `seeking`, `responsibilities`, `candidate`, `years`, `preferred`).
   - Uses `CountVectorizer(binary=True, ngram_range=(1,2))` to capture compound phrases like `machine learning` or `fast api`.
   - spaCy `PhraseMatcher` scans against a catalog of 70+ technical skills (`COMMON_SKILLS`).
   - Entities (`ORG`, `PRODUCT`, `WORK_OF_ART`) are extracted to identify proprietary platforms or tooling requirements.
4. **Semantic Vector Search**:
   - Model: `sentence-transformers/all-MiniLM-L6-v2`.
   - Text is split into up to 20 sentences via `sent_tokenize`.
   - Embeddings are computed and mean-pooled to generate a single dense vector of dimension 384.
   - Text hashes are cached in `BoundedEmbeddingCache` (thread-safe LRU with max capacity of 128 items) to minimize repeat CPU/GPU inference passes.
   - Cosine similarity between resume and job description vectors is scaled to a `0-100` percentage score.
5. **Fallback Safety**: If PyTorch and ONNX models fail to load due to missing native libraries or memory limits, `is_model_loaded()` reports `False`, semantic score defaults to 0, and lexical matching continues without crashing the server.

---

## 3. Data Flow & State Management

### 3.1 Client-Side State Management

The frontend uses React 19 component state within `client/src/App.jsx` as the centralized application state store without external state libraries (such as Redux or Zustand):

- **Active Tab Router**: State variable `activeTab` switches between views:
  - `'dashboard'`: Workspace scan statistics, recent match items, quick actions.
  - `'scanner'`: Document upload dropzone, job description textarea, match results, gauge, missing keywords, bullet suggestions.
  - `'team'`: Active organization switcher, member roster, role badges, invite form.
  - `'apikeys'`: Developer API key generation, prefix display, revocation.
- **Session State**: `token`, `userEmail`, `userName`, `isPremium` synced with `localStorage`.
- **Multi-Tenant State**: `orgs` list and `activeOrg` tracking the currently selected team organization.
- **Theme State**: `darkMode` persisted in `localStorage` and toggling the `dark` class on the root HTML document element.
- **Data Fetching**: Direct Axios HTTP calls with token authorization headers attached on demand.

```
[User Action: Upload File]
        │
        ▼
[ResumeDropzone.jsx] ── Axios POST /api/parse-pdf ──► [FastAPI Backend]
        │                                                     │
        ▼                                                     ▼
Text state updated (`resume`)                          Extracted text returned
        │
        ▼
[User Action: Click Analyze]
        │
        ▼
[App.jsx handleAnalyze] ── Axios POST /api/analyze ──► [FastAPI Backend]
        │                                                     │
        ▼                                                     ▼
Result state updated (`result`)                        Hybrid score + missing keywords
        │
        ▼
[ResultDisplay.jsx]
        ├── Render Overall Score, Lexical/Semantic breakdown
        ├── Render Missing Skills / Badges
        ├── Axios GET /api/analyze/{id}/suggestions (if Premium)
        └── Axios GET /api/history/{id}/export (Download ReportLab PDF)
```

### 3.2 Server-Side Data Persistence & ORM

The backend utilizes **SQLAlchemy 2.0 declarative models** (`server/models.py`) connected via `server/utils/db.py`.

```
                  ┌────────────────────┐
                  │        User        │
                  │────────────────────│
                  │ id (UUID)          │
                  │ email (unique)     │
                  │ password_hash      │
                  │ is_premium (prop)  │
                  └─────────┬──────────┘
                            │ 1:N
              ┌─────────────┼─────────────┐
              ▼ 1:N         ▼ 1:N         ▼ 1:N
       ┌──────────────┐┌──────────────┐┌──────────────┐
       │  Membership  ││    Resume    ││    ApiKey    │
       │──────────────││──────────────││──────────────│
       │ role: ENUM   ││ title        ││ key_prefix   │
       └──────┬───────┘│ is_archived  ││ key_hash     │
              │ N:1    └──────┬───────┘│ rate_limit   │
              ▼               │ 1:N    └──────────────┘
       ┌──────────────┐       ▼
       │ Organization │┌──────────────┐
       │──────────────││ResumeVersion │
       │ name, slug   ││──────────────│
       └──────┬───────┘│ version      │
              │ 1:1    │ resume_text  │
              ▼        │ parsed_json  │
       ┌──────────────┐└──────┬───────┘
       │ Subscription │       │ 1:N
       │──────────────│       ▼
       │ plan: TIER   │┌──────────────┐      ┌────────────────┐
       │ stripe_cust  ││   Analysis   │◄─────┤ JobDescription │
       │ status       ││──────────────│ 1:N  │────────────────│
       └──────────────┘│ score        │      │ title, job_text│
                       │ lexical      │      └────────────────┘
                       │ semantic     │
                       │ missing_kw   │
                       └──────────────┘
```

#### Key Relational Characteristics:
1. **Multi-Tenant Scoping**: `Organization` owns `Memberships`, `Subscription`, and optionally `Resumes` and `JobDescriptions`.
2. **Resume Versioning**: `Resume` acts as the persistent parent container; each scan or document update creates an immutable `ResumeVersion` containing raw text and parsed JSON sections.
3. **Analysis Entity**: Links a `ResumeVersion` with a `JobDescription`, persisting the calculated scores, missing keywords array, and skill gap mappings.
4. **Subscription Tier Resolution**: `User.is_premium` dynamically verifies whether any organization where the user holds active membership has an active `PRO` or `TEAM` subscription.

---

## 4. API Design & Communication Protocols

All client-server communication is over HTTP/1.1 (JSON payload or multipart form data).

### 4.1 Authentication & Profile APIs

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user; auto-provisions a personal Organization and Free Subscription. Returns JWT. |
| `POST` | `/api/auth/login` | Public | Validates email & bcrypt password hash. Returns JWT. |
| `GET` | `/api/auth/me` | Bearer | Returns profile information and `is_premium` status. |
| `PUT` | `/api/user/profile` | Bearer | Updates user profile metadata (name, LinkedIn, industry, job title). |

### 4.2 Document & Analysis APIs

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/parse-pdf` | Public | Accepts multipart upload (`.pdf` or `.docx`), verifies magic bytes, returns extracted plain text. |
| `POST` | `/api/analyze` | Optional | Evaluates resume against job description. Computes hybrid score. If authenticated, persists analysis and enforces free scan limits. |
| `GET` | `/api/history` | Bearer | Returns past scan history for the authenticated user's active resume. |
| `DELETE`| `/api/history/{analysis_id}`| Bearer | Deletes an analysis record. |
| `GET` | `/api/analyze/{id}/suggestions`| Bearer | Generates AI bullet rewrite recommendations via Gemini 1.5 Flash (premium feature). |
| `GET` | `/api/history/{id}/export`| Bearer | Generates and streams a ReportLab PDF report. |
| `GET` | `/api/health` | Public | Returns server status and semantic model readiness (`loaded` / `unavailable`). |

### 4.3 Teams & Multi-Tenancy APIs

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orgs` | Bearer | Lists all organizations the authenticated user belongs to. |
| `POST` | `/api/orgs` | Bearer | Creates a new organization workspace and registers user as `OWNER`. |
| `GET` | `/api/orgs/{org_id}/members` | Bearer | Lists all members in the specified organization. |
| `POST` | `/api/orgs/{org_id}/members` | Bearer | Invites a user by email with role (`OWNER`, `ADMIN`, `RECRUITER`, `VIEWER`). |
| `DELETE`| `/api/orgs/{org_id}/members/{id}`| Bearer | Removes a member from the organization (Owner/Admin only). |

### 4.4 Developer API Keys

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/apikeys` | Bearer | Lists active developer API key prefixes and rate limits. |
| `POST` | `/api/apikeys` | Bearer | Generates new API key (`rm_` prefix), hashes key with SHA-256 for storage, returns raw key once. |
| `DELETE`| `/api/apikeys/{key_id}` | Bearer | Revokes an API key. |

### 4.5 Billing & Webhooks

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/billing/checkout-session`| Bearer | Initiates Stripe Checkout session for subscription upgrade. |
| `POST` | `/api/billing/webhook` | Stripe Sig | Webhook endpoint listening for `checkout.session.completed` to upgrade organization to `PRO`. |
| `POST` | `/api/billing/mock-upgrade` | Bearer | Development endpoint to upgrade active workspace to `PRO` without live Stripe credentials. |

---

## 5. Key Architectural Patterns & Decisions

### 5.1 Hybrid Lexical + Semantic Scoring
- **Context**: Standard ATS scanners use exact keyword counts (lexical), failing candidates who describe skills using synonyms (e.g., "team leadership" vs "managed people"). Pure transformer vector search, however, can hallucinate or score non-matching resumes high based on generic industry prose.
- **Decision**: Combine **CountVectorizer** lexical overlap (40%) with **sentence-transformers** cosine similarity (60%).
- **Trade-off**: Requires running a 384-dimensional PyTorch/ONNX embedding model in Python. Addressed via `BoundedEmbeddingCache` and a graceful fallback mechanism if the model fails to load.

### 5.2 Decoupled Schema Definition (Prisma + SQLAlchemy)
- **Context**: The project maintains `prisma/schema.prisma` as a comprehensive specification of SaaS requirements (13 models, relations, indexes) alongside Python `server/models.py`.
- **Decision**: `prisma/schema.prisma` serves as the conceptual contract and future multi-language reference, while `SQLAlchemy 2.0` serves as the runtime ORM for FastAPI.
- **Migration State**: Alembic manages runtime SQL migrations. Migration `b8d95bb291f2_remove_workspace_entity.py` flattened direct workspace hierarchies into Organization-level multi-tenancy.

### 5.3 In-Memory LRU Embedding Cache
- **Context**: Computing embeddings for long resume documents takes 100-300ms on CPU. Repeat scans or slight edits should not re-run full transformer passes.
- **Decision**: `BoundedEmbeddingCache` in `server/services/ai_engine.py` maintains an ordered dictionary of pre-computed embeddings up to 128 entries keyed by text hash, secured with `threading.Lock`.
- **Limitation**: Single-instance in-memory cache does not share entries across horizontally scaled worker processes; production roadmap targets Redis.

### 5.4 Graceful Degradation for AI & Services
- **Gemini Rewrite Suggestions**: If `GEMINI_API_KEY` is not configured or exceeds quota, the system falls back to an offline heuristic bullet point generator without failing the API call.
- **Document Storage**: `server/utils/storage.py` inspects AWS environment variables; if unset, it falls back to saving files in `server/uploads/`.
- **Stripe Billing**: If Stripe credentials are unset, `/api/billing/checkout-session` returns a mock session payload directing users to test upgrades via `/api/billing/mock-upgrade`.

---

## 6. Known Architectural Debt & Transition State

The codebase reflects an active transition from an early Flask prototype to a modern FastAPI architecture:

1. **`server/app.py` Syntax & Startup Typo**: Lines 48-50 contain an unterminated string quote in `FLASK_DEBUG` parsing and unbalanced parenthesis in `uvicorn.run()` when executed directly with `python app.py`.
2. **Web Process Blocking**: The sentence transformer inference runs synchronously within the FastAPI threadpool. Under high concurrent traffic, this can exhaust worker threads.
3. **Rate Limiting Inconsistency**: `server/utils/limiter.py` imports `flask_limiter` which is incompatible with FastAPI; `slowapi` is in `requirements.txt` but not yet wired to FastAPI routers.
4. **File Storage Disconnect**: `server/utils/storage.py` is implemented and tested, but `server/routes/analyze.py` currently stores extracted text directly in the database with static `"database-direct"` URLs rather than invoking `upload_file()`.
5. **Procfile Configuration**: `Procfile` specifies `gunicorn app:app` without the Uvicorn worker class (`-k uvicorn.workers.UvicornWorker`), which will fail on ASGI servers unless adjusted.
