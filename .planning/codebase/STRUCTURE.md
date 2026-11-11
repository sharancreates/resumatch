# Directory & Codebase Structure — ResuMatch AI

This document provides a comprehensive structural guide to the **ResuMatch AI** repository. It details directory responsibilities, file purposes, naming conventions, and architectural placement patterns for extending the application.

---

## 1. Annotated Directory Tree

```
resumatch/
├── .github/                                # GitHub automation & configuration
│   └── workflows/
│       └── aion-review.yml                 # Automated AI pull request review action
├── .planning/                              # Project management, planning & architecture docs
│   └── codebase/                           # Deep codebase intelligence mappings
│       ├── ARCHITECTURE.md                 # System architecture, data flow & pipeline specs
│       ├── STACK.md                        # Technology stack and package inventory
│       └── STRUCTURE.md                    # Repository directory structure guide (this file)
├── client/                                 # Frontend SPA (React 19 + Vite 7 + Tailwind CSS)
│   ├── public/                             # Static public assets served untouched
│   ├── src/                                # Frontend application source code
│   │   ├── assets/                         # Graphic assets and icons
│   │   │   └── react.svg                   # Default SVG logo asset
│   │   ├── components/                     # Modular React UI components
│   │   │   ├── AuthModal.jsx               # User sign-in and sign-up dialog modal
│   │   │   ├── Header.jsx                  # Top navigation, status indicator, theme toggle
│   │   │   ├── HistoryDrawer.jsx           # Slide-out drawer displaying past scan logs
│   │   │   ├── JobTextArea.jsx             # Target job description text input component
│   │   │   ├── LandingPage.jsx             # Public marketing page with interactive sandbox
│   │   │   ├── ResultDisplay.jsx           # ATS score gauge, breakdown, gap analysis, export
│   │   │   ├── ResumeDropzone.jsx          # Drag-and-drop resume uploader (PDF/DOCX)
│   │   │   └── ScrollReveal.jsx            # Intersection-observer scroll animation wrapper
│   │   ├── App.css                         # Application-level supplemental styling
│   │   ├── App.jsx                         # Central client coordinator, state manager, views
│   │   ├── index.css                       # Tailwind CSS directives and global typography
│   │   └── main.jsx                        # React root DOM rendering entry point
│   ├── .gitignore                          # Frontend gitignore (node_modules, dist)
│   ├── eslint.config.js                    # ESLint 9 flat configuration
│   ├── index.html                          # HTML shell and root mounting element
│   ├── package.json                        # Frontend NPM dependencies and scripts
│   ├── package-lock.json                   # NPM dependency lockfile
│   ├── postcss.config.js                   # PostCSS pipeline for Tailwind processing
│   ├── README.md                           # Client setup and run guide
│   ├── tailwind.config.js                  # Tailwind design tokens, colors, dark mode mode
│   └── vite.config.js                      # Vite bundler build settings and React plugin
├── prisma/                                 # Database design reference
│   └── schema.prisma                       # 13-model Prisma schema (SaaS reference spec)
├── server/                                 # Backend REST API (FastAPI + SQLAlchemy)
│   ├── alembic/                            # Alembic database migration management
│   │   ├── versions/                       # Database schema version revision scripts
│   │   │   ├── dc8b0700a5fc_initial_schema.py        # Baseline schema migration
│   │   │   └── b8d95bb291f2_remove_workspace_entity.py # Workspace model flattening
│   │   ├── env.py                          # Alembic migration environment runner
│   │   ├── README                          # Alembic directory usage notes
│   │   └── script.py.mako                  # Migration template script
│   ├── instance/                           # Local runtime instance folder
│   ├── routes/                             # FastAPI route submodules and endpoints
│   │   ├── __init__.py                     # Package marker
│   │   ├── analyze.py                      # /api/analyze, /history, /parse-pdf, /health
│   │   ├── auth.py                         # /api/auth/register, /login, /me, /user/profile
│   │   ├── billing.py                      # /api/billing/checkout-session, /webhook, /mock
│   │   └── teams.py                        # /api/orgs/*, /members/*, /apikeys/*
│   ├── services/                           # Domain services and AI processing engines
│   │   ├── __init__.py                     # Package marker
│   │   └── ai_engine.py                    # NLP pipeline, hybrid scoring, embedding cache
│   ├── tests/                              # Backend test suite (pytest)
│   │   ├── test_parser.py                  # Unit tests for text parsing & segmentation
│   │   ├── test_robustness.py              # File upload signature and magic byte tests
│   │   ├── test_scoring.py                 # Hybrid scoring and keyword match tests
│   │   └── test_storage.py                 # Local and S3 upload/download tests
│   ├── uploads/                            # Local fallback storage folder for uploaded files
│   ├── utils/                              # Shared backend utilities and helpers
│   │   ├── __init__.py                     # Package marker
│   │   ├── auth_helper.py                  # JWT encoding/decoding, bcrypt password hashing
│   │   ├── db.py                           # SQLAlchemy engine, session factory, get_db
│   │   ├── docx_parser.py                  # DOCX paragraph and table text extractor
│   │   ├── limiter.py                      # Legacy Flask-Limiter placeholder
│   │   ├── pdf_parser.py                   # PyMuPDF binary PDF text extractor
│   │   ├── resume_parser.py                # Section segmentation and contact regex parser
│   │   └── storage.py                      # S3 / Cloudflare R2 / local disk storage client
│   ├── .env                                # Local environment secrets (gitignored)
│   ├── .env.example                        # Template environment variables
│   ├── alembic.ini                         # Alembic database configuration
│   ├── app.py                              # FastAPI core application entry point
│   ├── models.py                           # SQLAlchemy ORM declarative models
│   ├── Procfile                            # Cloud platform deployment process configuration
│   ├── requirements.txt                    # Python dependencies
│   └── resumatch.db                        # Local SQLite database (development)
├── .gitignore                              # Root gitignore rules
├── project_analysis_and_roadmap.md         # Comprehensive health audit, gaps, and roadmap
├── README.md                               # High-level repository readme and quickstart
└── system_design.md                        # Initial system architecture and functional spec
```

---

## 2. Directory Responsibilities

### 2.1 Frontend (`client/`)
- **`src/components/`**: Modular presentation and feature components.
  - `AuthModal.jsx`: Floating modal handling both registration and sign-in tabs with validation feedback.
  - `Header.jsx`: Top navigation showing system health status badge, active user email, premium status badge, history drawer toggle, and light/dark theme switch.
  - `HistoryDrawer.jsx`: Right-aligned slide-out drawer rendering chronological past scan records with match percentages and deletion triggers.
  - `JobTextArea.jsx`: Controlled textarea for pasting target job descriptions.
  - `LandingPage.jsx`: Public landing page containing a hero section, an interactive client-side sandbox teaser, feature spotlights, pricing tiers, and an FAQ accordion.
  - `ResultDisplay.jsx`: Core scanner results panel displaying circular score gauge, lexical/semantic split, missing keyword tags, AI-generated bullet recommendations, and PDF export trigger.
  - `ResumeDropzone.jsx`: Drag-and-drop file upload target supporting `.pdf` and `.docx` with asynchronous server-side text parsing.
  - `ScrollReveal.jsx`: Reusable animation wrapper using the browser's `IntersectionObserver` to reveal landing page sections on scroll.
- **`src/App.jsx`**: Central coordinator managing global application state (`activeTab`, `token`, `activeOrg`, `darkMode`, `result`, `history`), tab routing, and lifecycle effect hooks.
- **Root Configuration**: `vite.config.js` defines dev server options; `tailwind.config.js` configures color palettes and dark mode support; `package.json` pins dependencies.

### 2.2 Backend (`server/`)
- **`app.py`**: FastAPI application entry point. Configures CORS, mounts route routers, initializes database schema tables on startup, and launches Uvicorn.
- **`models.py`**: SQLAlchemy 2.0 ORM class declarations (`User`, `Organization`, `Membership`, `Workspace`, `Resume`, `ResumeVersion`, `JobDescription`, `Analysis`, `Subscription`, `ApiKey`, `UsageLog`, `AuditLog`).
- **`routes/`**: Grouped HTTP endpoint controllers.
  - `analyze.py`: Document parsing (`/parse-pdf`), hybrid scanning (`/analyze`), scan history (`/history`), bullet rewrite suggestions (`/analyze/{id}/suggestions`), PDF export (`/history/{id}/export`), and backend health check (`/health`).
  - `auth.py`: User registration with automatic personal workspace provisioning (`/auth/register`), authentication (`/auth/login`), profile retrieval (`/auth/me`), and profile updates (`/user/profile`).
  - `billing.py`: Stripe Checkout session creation (`/checkout-session`), Stripe signature-verified webhook handler (`/webhook`), and offline mock upgrade (`/mock-upgrade`).
  - `teams.py`: Multi-tenant organization CRUD (`/orgs`), member invitations and role management (`/orgs/{id}/members`), and developer API key lifecycle (`/apikeys`).
- **`services/`**: Core computational engines.
  - `ai_engine.py`: NLTK tokenization and stemming, CountVectorizer lexical matching, spaCy PhraseMatcher skill identification, named entity recognition, Sentence-Transformer vector embedding generation, and thread-safe LRU caching.
- **`utils/`**: Shared infrastructure and processing helpers.
  - `auth_helper.py`: PyJWT token encoding/decoding and FastAPI dependency injectors (`get_current_user`, `get_current_user_optional`).
  - `db.py`: Database engine configuration, thread safety for SQLite, and session generator (`get_db`).
  - `docx_parser.py`: Extracts raw text and table contents from `.docx` streams.
  - `pdf_parser.py`: Extracts text from `.pdf` streams via PyMuPDF.
  - `resume_parser.py`: Regex extraction for email, phone, and LinkedIn, plus section segmentation (Contact, Skills, Experience, Education, Projects).
  - `storage.py`: Multi-backend object storage utility supporting S3/Cloudflare R2 and local filesystem fallback.
  - `limiter.py`: Rate limiting utility placeholder.
- **`alembic/`**: Database migration environment and revision files.

### 2.3 Database Specification (`prisma/`)
- **`prisma/schema.prisma`**: Comprehensive 13-model Prisma schema. Acts as the formal data contract and reference model for multi-tenant organizations, memberships, subscriptions, workspaces, and audit logs.

---

## 3. Key Entry Points & Execution Flow

### 3.1 Backend Entry Points

| File | Purpose | Invocation |
| :--- | :--- | :--- |
| `server/app.py` | Primary FastAPI application server | `uvicorn app:app --reload --port 5001` or `python app.py` |
| `server/utils/db.py` | Database schema initialization | Called via `init_db()` during FastAPI startup hook |
| `server/alembic/env.py` | Database schema migration runner | `alembic upgrade head` |

### 3.2 Frontend Entry Points

| File | Purpose | Invocation |
| :--- | :--- | :--- |
| `client/src/main.jsx` | React 19 root bootstrap into DOM | Imported by `client/index.html` |
| `client/src/App.jsx` | Main application shell and router | Rendered by `main.jsx` |

---

## 4. Naming Conventions

The codebase follows distinct conventions across its frontend and backend stacks:

### 4.1 Frontend Conventions (React / JavaScript)
- **Component Files**: PascalCase (e.g., `ResultDisplay.jsx`, `ResumeDropzone.jsx`).
- **CSS / Style Files**: Lowercase or kebab-case (e.g., `index.css`, `App.css`).
- **Configuration Files**: Lowercase or dot-prefixed (e.g., `vite.config.js`, `tailwind.config.js`, `eslint.config.js`).
- **Component Names**: PascalCase matching file name (e.g., `function HistoryDrawer(...)`).
- **Hook & State Variables**: camelCase (e.g., `activeTab`, `setActiveTab`, `isPremium`).
- **Event Handlers**: Prefixed with `handle` or `on` (e.g., `handleAnalyze`, `onGetStarted`).

### 4.2 Backend Conventions (Python / FastAPI)
- **Module & File Names**: snake_case (e.g., `ai_engine.py`, `auth_helper.py`, `docx_parser.py`).
- **ORM Model Classes**: PascalCase (e.g., `User`, `Organization`, `ResumeVersion`, `JobDescription`).
- **Database Tables**: Plural snake_case (e.g., `users`, `organizations`, `resume_versions`, `api_keys`).
- **Database Columns**: snake_case (e.g., `password_hash`, `key_prefix`, `created_at`).
- **Pydantic Request Schemas**: PascalCase ending in `Request` (e.g., `RegisterRequest`, `AnalyzeRequest`, `InviteMemberRequest`).
- **Route Handlers**: snake_case verb-noun (e.g., `analyze_endpoint`, `create_organization`, `get_user_apikeys`).
- **Global Constants**: UPPER_SNAKE_CASE (e.g., `COMMON_SKILLS`, `CUSTOM_IGNORE`, `SECTION_HEADERS`).

---

## 5. Development & Feature Placement Guide

When adding new capabilities to ResuMatch AI, place files and code following these architectural conventions:

### 5.1 Adding a New API Endpoint
1. **Define Schema**: If request/response validation is needed, define a Pydantic model at the top of the relevant router file or in a new `server/schemas/` directory.
2. **Implement Route**:
   - Authentication-related: Add to `server/routes/auth.py`.
   - Scoring / Analysis-related: Add to `server/routes/analyze.py`.
   - Workspace / Org / Team / Keys: Add to `server/routes/teams.py`.
   - Billing / Subscriptions: Add to `server/routes/billing.py`.
   - New domain domain: Create `server/routes/<new_domain>.py` and mount it in `server/app.py` via `app.include_router()`.
3. **Inject Dependencies**: Use `Depends(get_db)` for database access and `Depends(get_current_user)` for protected routes.

### 5.2 Adding a New Database Entity
1. **Declare Model**: Add the SQLAlchemy declarative class in `server/models.py`, inheriting from `Base`.
2. **Define Relationships**: Add bidirectional relationships using `relationship()` with appropriate `cascade` and foreign key rules.
3. **Update Prisma Schema**: Mirror the model in `prisma/schema.prisma` to keep specifications synchronized.
4. **Generate Migration**: Run `alembic revision --autogenerate -m "Add <entity_name>"` in `server/` and apply with `alembic upgrade head`.

### 5.3 Adding AI / NLP Capabilities
1. **Place Logic in Services**: Never place raw machine learning or external API logic directly inside route handlers. Add functions to `server/services/ai_engine.py` or create a new service module (e.g., `server/services/llm_service.py`).
2. **Thread Safety & Caching**: If using in-memory models or caches, wrap shared access in `threading.Lock` and provide fallback handling for when models cannot be loaded.

### 5.4 Adding a New Frontend Feature or Tab
1. **Component Creation**: Create a new component in `client/src/components/<FeatureName>.jsx`.
2. **Mounting**: In `client/src/App.jsx`, add a state-controlled tab identifier in `activeTab` or render conditionally.
3. **API Integration**: Make HTTP requests using `axios` pointing to `${API_URL}/api/<endpoint>` with `Authorization: Bearer ${token}` header when user authentication is required.
4. **Styling**: Use standard Tailwind CSS utility classes, providing explicit `dark:` variants to support the dark theme mode.
