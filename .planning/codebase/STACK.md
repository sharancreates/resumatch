# ResuMatch AI — Technology Stack Documentation

This document provides a comprehensive overview of the languages, runtimes, frameworks, libraries, tools, environment configurations, and key dependencies used in the **ResuMatch AI** codebase.

---

## 1. Executive Stack Summary

| Dimension | Technology | Primary Role |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19.2 (Vite 7.2) | Single-page application, interactive UI, dark mode |
| **Styling** | Tailwind CSS 3.4 + PostCSS 8.5 | Utility-first styling with responsive & dark theme support |
| **Backend Framework** | FastAPI 0.110 (Python 3.10 / 3.11) | High-performance ASGI REST API server |
| **ASGI Server** | Uvicorn 0.28 | Async event-loop web server |
| **Database & ORM** | SQLAlchemy 2.0 + Alembic / Prisma Schema | Relational data persistence & migrations |
| **Relational Databases** | PostgreSQL 14+ (Prod) / SQLite 3 (Dev) | Structured data, multi-tenant organizations & scan logs |
| **NLP & ML Engine** | Sentence-Transformers, PyTorch / ONNX Runtime, SpaCy, NLTK, Scikit-Learn | Hybrid lexical + semantic resume evaluation |
| **Document Parsers** | PyMuPDF (fitz), python-docx | Text extraction from PDF & DOCX resumes |
| **Reporting** | ReportLab 4.0 | On-the-fly downloadable PDF match reports |
| **Payment Provider** | Stripe Python SDK 7.11 | Subscription checkout & webhook event processing |
| **AI Rewrite Service** | Google Gemini 1.5 Flash REST API | Generative resume bullet rewrite suggestions |
| **Storage Abstraction** | Boto3 (AWS S3 / Cloudflare R2) + Local fallback | Document asset storage |
| **CI / Code Review** | GitHub Actions + OpenRouter Qwen 2.5 Coder | Automated pull-request review |

---

## 2. Languages & Runtimes

### 2.1 Backend Runtime
- **Language**: Python
- **Target Versions**: Python `3.10` / `3.11` (verified via bytecode cache `cpython-311`, `cpython-312` and dependency pins `numpy<2.0.0`, `optimum[onnxruntime]==1.24.0`).
- **Execution Model**: Single-process asynchronous event loop powered by `asyncio` and `uvicorn`, with synchronous blocking calls handled in worker threads or within route endpoints.

### 2.2 Frontend Runtime
- **Language**: JavaScript (ECMAScript 2022+ / JSX)
- **Module Format**: Native ES Modules (`"type": "module"` in `client/package.json`).
- **Browser Targets**: Modern evergreen browsers supporting ES2020+, CSS Flexbox/Grid, and `window.matchMedia`.

### 2.3 Database Dialects
- **Production Dialect**: PostgreSQL (`psycopg2-binary==2.9.9`, target versions 14–16).
- **Development Dialect**: SQLite 3 (`sqlite:///resumatch.db`), enabled with `check_same_thread=False` to support multi-threaded FastAPI request workers.

---

## 3. Frameworks & Libraries

### 3.1 Frontend (`client/`)

| Package | Version | Purpose | Notes |
| :--- | :--- | :--- | :--- |
| **`react`** | `^19.2.0` | Declarative UI component tree | Latest React 19 architecture |
| **`react-dom`** | `^19.2.0` | DOM renderer for React | Client-side DOM mounting (`createRoot`) |
| **`axios`** | `^1.13.2` | Promise-based HTTP client | Interacts with backend `/api` endpoints, handles Blob downloads |
| **`tailwindcss`** | `^3.4.17` | Utility-first CSS styling | Configured with `darkMode: 'class'` and content scanning |
| **`postcss`** | `^8.5.6` | CSS transformation engine | Required by Tailwind for CSS bundling |
| **`vite`** | `^7.2.4` | Next-generation frontend tooling | Development server, HMR, and production bundler |
| **`@vitejs/plugin-react`**| `^5.1.1` | Vite React plugin | Babel/Fast-Refresh integration |
| **`eslint`** | `^9.39.1` | Code linting engine | Modern flat config (`eslint.config.js`) |
| **`eslint-plugin-react-hooks`** | `^7.0.1` | React Hooks lint rules | Enforces hook call rules and dependencies |
| **`eslint-plugin-react-refresh`** | `^0.4.24` | Fast Refresh linting | Warns against invalid React component exports |
| **`globals`** | `^16.5.0` | Global variable definitions | Browser environment globals for ESLint |

#### Frontend Architecture & Patterns:
- **Routing**: Single-Page Application (SPA) with tab-driven view switching (`dashboard`, `scanner`, `team`, `apikeys`) governed by top-level state in `client/src/App.jsx`.
- **State Management**: React `useState` and `useEffect` hooks for local state. Authentication token (`token`) and user email (`userEmail`) are persisted in `localStorage`.
- **Theming**: Dark mode toggled by adding/removing the `dark` class on `document.documentElement` and persisting selection to `localStorage.getItem('theme')`.
- **Proxy Configuration**: `client/vite.config.js` routes all `/api` calls directly to `http://127.0.0.1:5001` during local development, bypassing CORS constraints.

---

### 3.2 Backend Framework & Core Server (`server/`)

| Package | Version | Purpose | Notes |
| :--- | :--- | :--- | :--- |
| **`fastapi`** | `0.110.0` | Primary REST API framework | Built on Starlette, provides OpenAPI / Swagger docs, async routing |
| **`uvicorn`** | `0.28.0` | ASGI web server | Runs FastAPI server; supports live-reload via `--reload` |
| **`pydantic`** | `2.6.4` | Data validation and settings | Pydantic V2 core schemas for request payloads |
| **`pydantic-settings`** | `2.2.1` | Settings management | Environment variable loading & validation |
| **`python-multipart`** | `0.0.9` | Multipart form parsing | Handles file uploads (`UploadFile`) for PDF/DOCX ingestion |
| **`python-dotenv`** | `1.0.0` | `.env` file loader | Loads environment variables into `os.environ` on startup |
| **`PyJWT`** | `2.8.0` | JSON Web Token encoding/decoding | Issues HS256 signed access tokens with 7-day expiration |
| **`passlib[bcrypt]`** | `1.7.4` | Cryptographic password hashing | Bcrypt password hashing (`pwd_context = CryptContext(...)`) |
| **`slowapi`** | `0.1.9` | Rate limiting for ASGI/FastAPI | In-memory / Redis rate limiting (installed; partially active) |

#### Backend Routing Structure (`server/routes/`):
- **`analyze.py`** (`prefix="/api"`):
  - `POST /analyze` — Hybrid ATS match scoring, structure extraction, DB history persistence.
  - `GET /history` — Fetch user scan history records.
  - `DELETE /history/{analysis_id}` — Remove specific scan log.
  - `POST /parse-pdf` — Extracts raw text from uploaded PDF or DOCX file streams.
  - `GET /analyze/{analysis_id}/suggestions` — Generates AI rewrite bullet points (Gemini / rule-based fallback).
  - `GET /history/{analysis_id}/export` — Generates on-the-fly downloadable PDF report via ReportLab.
  - `GET /health` — Service health check and semantic model readiness indicator.
- **`auth.py`** (`prefix="/api"`):
  - `POST /auth/register` — Creates user, creates personal organization, links OWNER membership, creates FREE subscription.
  - `POST /auth/login` — Verifies password, returns 7-day JWT.
  - `GET /auth/me` — Returns serialized user profile and premium status.
  - `PUT /user/profile` — Updates user metadata (name, LinkedIn, industry, title).
- **`billing.py`** (`prefix="/api/billing"`):
  - `POST /checkout-session` — Generates Stripe Checkout subscription session.
  - `POST /webhook` — Verifies Stripe webhook signatures and updates organization subscriptions to PRO.
  - `POST /mock-upgrade` — Instant developer upgrade to PRO without Stripe keys.
- **`teams.py`** (`prefix="/api"`):
  - `GET /orgs` / `POST /orgs` — List and create organization workspaces.
  - `GET /orgs/{id}/members` / `POST /orgs/{id}/members` / `DELETE /orgs/{id}/members/{id}` — Manage team roster.
  - `GET /apikeys` / `POST /apikeys` / `DELETE /apikeys/{id}` — Developer API key lifecycle management.

---

### 3.3 Database, ORM & Migrations

| Technology | Version / Spec | Purpose | Notes |
| :--- | :--- | :--- | :--- |
| **`SQLAlchemy`** | `2.0.28` | Object Relational Mapper | Modern 2.0 declarative base (`models.Base = declarative_base()`) |
| **`psycopg2-binary`** | `2.9.9` | PostgreSQL DBAPI driver | C-extension PostgreSQL connector |
| **`Alembic`** | `1.10+` | Database migration framework | Tracks revision history (`server/alembic/`) |
| **`Prisma Schema`** | `prisma-client-js` | Conceptual canonical schema | Located at `prisma/schema.prisma` with 13 entity definitions |
| **SQLite 3** | Embedded | Local development engine | Stored at `server/resumatch.db` / `server/instance/resumatch.db` |

#### Database Models (`server/models.py`):
1. **`User`**: Core user accounts, bcrypt password hash, profile metadata, email verification flag.
2. **`Organization`**: Multi-tenant workspace grouping entity with unique slug.
3. **`Membership`**: Links `User` to `Organization` with roles (`OWNER`, `ADMIN`, `RECRUITER`, `VIEWER`).
4. **`Workspace`**: Optional sub-organization grouping (marked for removal in migration `b8d95bb291f2`).
5. **`Resume`**: User-owned resume container (optionally scoped to organization/workspace).
6. **`ResumeVersion`**: Versioned snapshot containing raw `resume_text` and structured `parsed_json`.
7. **`JobDescription`**: Target job descriptions with company name, raw text, and tags.
8. **`Analysis`**: Scan result records (overall score, lexical score, semantic score, missing keywords, recommendations).
9. **`Subscription`**: Stripe customer ID, subscription ID, status (`active`, `past_due`, `canceled`), and plan (`FREE`, `PRO`, `TEAM`).
10. **`ApiKey`**: Developer API credentials storing SHA-256 hash, key prefix (`rm_...`), and rate limit.
11. **`UsageLog`**: Scan quota tracking per user and endpoint.
12. **`AuditLog`**: Security compliance log for administrative team actions.

---

### 3.4 Natural Language Processing & Machine Learning

| Library | Version | Role in ResuMatch | Notes |
| :--- | :--- | :--- | :--- |
| **`transformers`** | `4.47.1` | Hugging Face transformer model loading | Loads `sentence-transformers/all-MiniLM-L6-v2` via PyTorch CPU |
| **`optimum[onnxruntime]`** | `1.24.0` | ONNX runtime inference acceleration | Fallback loader for `optimum/all-MiniLM-L6-v2` if PyTorch fails |
| **`scikit-learn`** | `1.3.2` | Vectorization & lexical cosine similarity | `CountVectorizer(binary=True, ngram_range=(1, 2))` |
| **`spacy`** | `3.7.2` | NLP parsing, Entity Recognition, Skill Matching | Uses `en_core_web_sm` and `PhraseMatcher` over common tech skills |
| **`nltk`** | `3.9.1` | Stemming, sentence and word tokenization | `PorterStemmer`, `word_tokenize`, `sent_tokenize`, `stopwords` |
| **`numpy`** | `<2.0.0` | Vector mathematics & cosine similarity | Computes dot products and L2 norms on 384-dimensional embeddings |

#### ATS Hybrid Algorithm Breakdown (`server/services/ai_engine.py`):
- **Lexical Score (40% Weight)**:
  - Input text cleaned, whitespace collapsed, non-alphanumeric stripped, lowercase.
  - Tokenized with NLTK, stemmed with `PorterStemmer`, filtered against stopwords + custom recruiter ignore words (~50 words).
  - Vectorized using `CountVectorizer` with unigrams and bigrams (`ngram_range=(1,2)`).
  - Cosine similarity computed against job description.
  - Skill and entity extraction performed with SpaCy `PhraseMatcher` and NER (`ORG`, `PRODUCT`).
  - Missing keywords extracted in three tiers (missing hard skills -> missing entities -> stem frequency difference).
- **Semantic Score (60% Weight)**:
  - Text split into sentences (up to 20 sentences per document).
  - Passed into `all-MiniLM-L6-v2` (384-dimensional dense vectors).
  - Mean-pooled per sentence, then mean-pooled across sentences into document vector.
  - Thread-safe LRU caching (`BoundedEmbeddingCache`, max 128 items) keyed by text hash.
  - Dot product divided by product of L2 norms clamped to `[0, 100]`.
- **Combined Hybrid Score**:
  $$\text{Final Score} = \text{round}(0.4 \times \text{Lexical Score} + 0.6 \times \text{Semantic Score}, 2)$$

---

### 3.5 Document Parsing & Report Generation

| Library | Version | Role | Supported Formats |
| :--- | :--- | :--- | :--- |
| **`pymupdf`** (`fitz`) | `1.23.8` | High-speed PDF text extraction | `.pdf` (validates `%PDF` magic bytes) |
| **`python-docx`** | `1.1.0` | Microsoft Word document parsing | `.docx` (validates `PK\x03\x04` zip headers, traverses paragraphs & tables) |
| **`reportlab`** | `4.0.8` | Programmatic PDF document generation | Produces branded `.pdf` match reports with tables, colors, and styling |

---

## 4. Package Managers & Build Tooling

### 4.1 Node.js / Client Tooling
- **Package Manager**: npm (`package-lock.json` lockfile present, version 3 format).
- **Build Tool**: Vite 7.2 (`vite build` outputs to `client/dist/`).
- **PostCSS Processor**: Processes `@tailwind base`, `@tailwind components`, `@tailwind utilities`.
- **Scripts**:
  - `npm run dev`: Starts Vite dev server on `http://localhost:5173`.
  - `npm run build`: Type-checks and creates production build in `client/dist`.
  - `npm run lint`: Runs ESLint 9 across all JS/JSX files.
  - `npm run preview`: Locally previews production build.

### 4.2 Python / Server Tooling
- **Package Manager**: `pip` with pinned `server/requirements.txt`.
- **Virtual Environment**: Standard Python venv (`server/env`).
- **Deployment Process**: `Procfile` configured for container/PaaS runners:
  ```procfile
  web: gunicorn app:app --workers 1 --threads 1 --timeout 120
  ```
  *(Note: When running FastAPI under Gunicorn, worker class `-k uvicorn.workers.UvicornWorker` is recommended, or launching with `python app.py` which executes `uvicorn.run(...)`).*
- **Database Migrations**: Alembic CLI (`alembic upgrade head`, `alembic revision --autogenerate`).

---

## 5. Environment Variables & Configuration Management

### 5.1 Server-Side Configuration (`server/.env`)

| Variable Name | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | `sqlite:///resumatch.db` | SQLAlchemy connection URI (PostgreSQL or SQLite) |
| `SECRET_KEY` | Yes | `dev-secret-key-resumatch-9821` | Secret key used for signing HS256 JWT tokens |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated list of CORS origins allowed |
| `FLASK_DEBUG` | No | `false` | Enables Uvicorn reload mode when `true` or `1` |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend origin for Stripe redirect success/cancel URLs |
| `STRIPE_SECRET_KEY` | Optional | *None* | Stripe secret key (`sk_test_...` / `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET`| Optional | *None* | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID` | Optional | *None* | Stripe price ID for PRO plan subscription |
| `GEMINI_API_KEY` | Optional | *None* | Google Gemini API key for AI bullet rewrites |
| `AWS_ACCESS_KEY_ID` | Optional | *None* | AWS / R2 storage access key |
| `AWS_SECRET_ACCESS_KEY`| Optional | *None* | AWS / R2 storage secret access key |
| `AWS_DEFAULT_REGION` | No | `us-east-1` | AWS S3 region |
| `S3_ENDPOINT_URL` | Optional | *None* | Custom S3 endpoint (e.g. for Cloudflare R2 / MinIO) |
| `S3_BUCKET_NAME` | Optional | *None* | S3 bucket name for uploaded resume files |

### 5.2 Client-Side Configuration (`client/.env`)

| Variable Name | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | No | `""` (empty string) | Root URL for API calls. If empty, uses Vite proxy `/api` |

---

## 6. Comprehensive Dependencies Matrix

### 6.1 Backend (`server/requirements.txt`)

```text
fastapi==0.110.0
uvicorn==0.28.0
pydantic==2.6.4
pydantic-settings==2.2.1
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
PyJWT==2.8.0
nltk==3.9.1
scikit-learn==1.3.2
numpy<2.0.0
transformers==4.47.1
optimum[onnxruntime]==1.24.0
SQLAlchemy==2.0.28
psycopg2-binary==2.9.9
python-dotenv==1.0.0
pymupdf==1.23.8
python-docx==1.1.0
spacy==3.7.2
stripe==7.11.0
reportlab==4.0.8
slowapi==0.1.9
```
*(Note: `boto3` is used in `server/utils/storage.py` and should be installed when S3 storage integration is activated).*

### 6.2 Frontend (`client/package.json`)

```json
{
  "dependencies": {
    "axios": "^1.13.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "vite": "^7.2.4"
  }
}
```

---

## 7. Known Architectural Considerations

1. **In-Process ML Loading**: The Sentence-Transformer model (`all-MiniLM-L6-v2`) runs in-memory within the Uvicorn process. While optimized with an LRU cache, heavy concurrent scanning will be CPU-bound.
2. **Postgres vs SQLite Dual Compatibility**: SQLite is default for zero-config onboarding; PostgreSQL is required for multi-tenant production concurrency with connection pooling.
3. **Legacy Flask Artifacts**: Configuration variables like `FLASK_DEBUG` and `server/utils/limiter.py` (which imports `flask_limiter`) represent remnants from a previous Flask prototype that has been migrated to FastAPI.
