# ResuMatch AI — Codebase Conventions & Standards

This document describes the architectural conventions, code formatting and linting rules, naming standards, typing practices, error handling mechanisms, and common recurring idioms across the ResuMatch codebase.

---

## 1. Code Formatting & Linting

### Client (`client/`)
- **Linter**: ESLint 9 Flat Config ([`client/eslint.config.js`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/eslint.config.js)).
  - Configurations extended:
    - `@eslint/js`: `js.configs.recommended`
    - `eslint-plugin-react-hooks`: `reactHooks.configs.flat.recommended`
    - `eslint-plugin-react-refresh`: `reactRefresh.configs.vite`
  - Target files: `**/*.{js,jsx}`
  - Ignored directories: `dist/`
  - Language options: ECMAScript 2020, browser globals (`globals.browser`), JSX enabled, ECMAScript modules (`sourceType: 'module'`).
  - Custom rules:
    ```javascript
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    }
    ```
    *(Allows unused identifiers that start with an uppercase letter or underscore, accommodating React components and constants).*
- **Formatter**: No dedicated Prettier configuration or package is defined. Formatting follows standard JavaScript 2-space indentation.
- **Styling**: Tailwind CSS v3 ([`client/tailwind.config.js`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/tailwind.config.js)) with PostCSS ([`client/postcss.config.js`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/postcss.config.js)).
  - Dark mode configured via class strategy (`darkMode: 'class'`).
  - Style rules are written primarily as inline Tailwind utility classes.
- **Verification Command**:
  ```bash
  cd client
  npm run lint
  ```

### Server (`server/`)
- **Linters / Formatters**: No explicit linter or formatter configuration files exist in the repository (e.g., no `pyproject.toml`, `setup.cfg`, `.flake8`, `ruff.toml`, or `pycodestyle`).
- **Style Standard**: Follows standard PEP 8 conventions:
  - 4-space indentation throughout.
  - Mixed single and double quotes for string literals.
  - Imports grouped informally: Standard library (`os`, `re`, `uuid`, `json`, `datetime`), third-party libraries (`fastapi`, `sqlalchemy`, `pydantic`, `nltk`, `spacy`, `reportlab`), followed by internal modules (`models`, `utils.*`, `services.*`).
- **Automated CI Code Review**:
  - Configured in [`.github/workflows/aion-review.yml`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/.github/workflows/aion-review.yml).
  - Uses `Wall-E-30/code-reviewer@main` with `qwen/qwen-2.5-coder-32b-instruct` provider to review pull requests and PR comments (`/review`), failing PR checks if review findings are identified.

---

## 2. Naming Conventions

### Client-Side (React / JavaScript)

| Category | Convention | Examples | Notes |
| :--- | :--- | :--- | :--- |
| **Component Files** | PascalCase (`.jsx`) | [`AuthModal.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/AuthModal.jsx), [`ResultDisplay.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/ResultDisplay.jsx), [`ResumeDropzone.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/ResumeDropzone.jsx) | Located under `client/src/components/` |
| **Component Functions** | PascalCase | `function AuthModal({ ... })`, `function LandingPage({ ... })` | Exported as `export default ComponentName;` |
| **State Variables** | camelCase | `resume`, `activeTab`, `authModalOpen`, `isRegister`, `activeOrg`, `history` | Declared using React `useState` |
| **Event Handlers** | `handle*` camelCase | `handleAnalyze`, `handleUpgrade`, `handleCreateOrg`, `handleAuthSubmit`, `handleDrag`, `handleDrop`, `handleDownloadPDF` | Attached directly to JSX events (`onClick`, `onSubmit`) |
| **Constants / Env** | SCREAMING_SNAKE_CASE | `API_URL` | Sourced from `import.meta.env.VITE_API_URL` |
| **CSS Utility Classes** | kebab-case | `bg-white`, `dark:bg-gray-800`, `rounded-xl`, `shadow-sm` | Standard Tailwind CSS utilities |

### Server-Side (FastAPI / Python)

| Category | Convention | Examples | Notes |
| :--- | :--- | :--- | :--- |
| **Module Files** | snake_case (`.py`) | [`ai_engine.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/services/ai_engine.py), [`auth_helper.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/utils/auth_helper.py), [`pdf_parser.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/utils/pdf_parser.py), [`resume_parser.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/utils/resume_parser.py) | Module directories: `routes/`, `services/`, `utils/`, `tests/` |
| **SQLAlchemy Models** | PascalCase (Singular) | `User`, `Organization`, `Membership`, `Workspace`, `Resume`, `ResumeVersion`, `JobDescription`, `Analysis`, `Subscription`, `ApiKey`, `UsageLog`, `AuditLog` | Defined in [`server/models.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/models.py) inheriting from `Base` |
| **Database Tables** | snake_case (Plural) | `users`, `organizations`, `memberships`, `workspaces`, `resumes`, `resume_versions`, `job_descriptions`, `analyses`, `subscriptions`, `api_keys`, `usage_logs`, `audit_logs` | Assigned via `__tablename__` |
| **Pydantic Schemas** | PascalCase | `RegisterRequest`, `LoginRequest`, `ProfileUpdateRequest`, `AnalyzeRequest`, `CreateOrgRequest`, `InviteMemberRequest`, `CreateApiKeyRequest` | Inherit from `pydantic.BaseModel` |
| **Functions & Methods** | snake_case | `hybrid_match_score()`, `extract_skills_and_entities()`, `parse_pdf()`, `get_db()`, `get_current_user()`, `encode_auth_token()` | Follows standard Python convention |
| **Router Instances** | `<domain>_router` | `auth_router`, `billing_router`, `analyze_router`, `teams_router` | Created via `APIRouter(prefix="/api...", tags=[...])` |
| **Module Constants** | SCREAMING_SNAKE_CASE | `STOP_WORDS`, `CUSTOM_IGNORE`, `COMMON_SKILLS`, `SECTION_HEADERS`, `EMAIL_REGEX`, `SECRET_KEY`, `ALGORITHM` | Declared at module scope |
| **API Endpoints** | kebab-case or single nouns under `/api` | `/api/auth/register`, `/api/auth/login`, `/api/parse-pdf`, `/api/billing/checkout-session`, `/api/billing/mock-upgrade`, `/api/orgs/{org_id}/members` | HTTP verbs convey intent (`GET`, `POST`, `PUT`, `DELETE`) |

---

## 3. Typing Standards

### Frontend (Client)
- Pure JavaScript (ES Modules, React 19 JSX).
- **TypeScript**: Not in use. There is no `tsconfig.json` or `.ts`/`.tsx` files.
- **Component Props**: Props are passed without runtime type checking (no `prop-types` library). Props are destructured directly within component parameters.

### Backend (Server)
- **Python Version Target**: Python 3.10 / 3.11+.
- **Type Annotations**:
  - Uses Python 3.10+ union syntax (`User | None`, `str | None`) rather than `typing.Optional` or `typing.Union`.
  - Type annotations are consistently applied to FastAPI route parameters and dependency injections:
    ```python
    @teams_router.post('/orgs/{org_id}/members')
    def invite_member(
        org_id: str, 
        req: InviteMemberRequest, 
        user: User = Depends(get_current_user), 
        db: Session = Depends(get_db)
    ):
    ```
  - Return types are partially annotated in utility functions (`def hash_password(password: str) -> str:`, `def upload_file(...) -> str:`), but route handlers typically omit explicit response type annotations.
- **Pydantic Validation**:
  - Request bodies strictly inherit from `pydantic.BaseModel`.
  - Fields use basic types (`str`, `int`) and optional union expressions (`name: str | None = None`).
  - Response validation schemas (`response_model=...`) are not currently utilized; route functions return raw Python dictionaries that FastAPI serializes automatically.
- **SQLAlchemy Typing**:
  - All model attributes use typed SQLAlchemy Column declarations: `Column(String(36))`, `Column(Integer)`, `Column(Float)`, `Column(Boolean)`, `Column(DateTime)`, `Column(JSON)`, `Column(Text)`.
  - Primary and foreign keys are explicitly typed as 36-character strings representing UUID v4 identifiers (`Column(String(36), primary_key=True)`).

---

## 4. Error Handling & HTTP Response Patterns

### Backend Error Handling

1. **FastAPI `HTTPException`**:
   - HTTP errors are raised directly via `fastapi.HTTPException` specifying `status_code` and `detail`.
   - Standard HTTP status codes used:
     - `400 Bad Request`: Validation failures (empty text, inputs exceeding length limits, malformed emails, invalid file magic bytes).
     - `401 Unauthorized`: Missing or invalid Bearer tokens, bad login credentials, expired signatures.
     - `403 Forbidden`: Insufficient organization role (e.g., non-admin inviting members), free-tier scan limit reached (10 scans), or cross-tenant access attempts.
     - `404 Not Found`: Missing resource records (analysis ID, organization ID, API key ID).
     - `409 Conflict`: Resource collision (e.g., registering an already registered email).
     - `500 Internal Server Error`: Unhandled database exceptions, external API failures, or internal parsing faults.

2. **Database Transaction Rollback Pattern**:
   All database write operations follow a strict `try / commit / except / rollback` pattern:
   ```python
   try:
       db.add(new_entity)
       db.commit()
       return {"status": "success", "data": new_entity.to_dict()}
   except Exception as e:
       db.rollback()
       logger.error(f"Operation Failed: {str(e)}")
       raise HTTPException(status_code=500, detail=str(e))
   ```

3. **Fault-Tolerant Resilience Pattern**:
   - In critical workflows like `/api/analyze`, if database persistence encounters an error, the error is logged and the transaction rolled back, but the endpoint still returns the computed ATS match scores in the response payload instead of failing completely for the user.
   - Fallbacks exist across external integrations:
     - PyTorch failure -> ONNX model fallback -> Lexical-only calculation (0.0 semantic).
     - Gemini API outage -> Deterministic template-based bullet suggestions.
     - S3 storage failure / missing credentials -> Local filesystem storage in `server/uploads/`.
     - Stripe missing credentials -> Mock billing session with `/mock-upgrade`.

### Backend Response Schema Conventions

- **Success Response Structure**:
  ```json
  {
    "status": "success",
    "message": "Human readable confirmation (optional)",
    "data": { ... }
  }
  ```
- **Error Response Structure** (FastAPI Default):
  ```json
  {
    "detail": "Descriptive error message"
  }
  ```
- **Binary Streaming Response**:
  - PDF downloads ([`/api/history/{id}/export`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/routes/analyze.py#L318-L446)) use `fastapi.responses.StreamingResponse` with media type `application/pdf` and `Content-Disposition: attachment; filename=...`.

### Frontend Error Handling

- **Asynchronous Calls**: All API invocations are wrapped in `try / catch / finally` blocks with `axios`.
- **User Alerts**: The client relies primarily on standard browser dialogs (`window.alert()`, `window.confirm()`) for user notifications and error notices rather than dedicated toast libraries:
  ```javascript
  try {
    const response = await axios.post(`${API_URL}/api/analyze`, { resume, job }, { headers });
    setResult(response.data.data);
  } catch (error) {
    console.error("Analysis failed:", error);
    alert("Failed to connect to server. Check if backend is running.");
  } finally {
    setLoading(false);
  }
  ```
- **Form-Level Errors**: Contextual forms (such as [`AuthModal.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/AuthModal.jsx)) capture errors in dedicated state (`authError`, `sugError`) and render inline banner warnings.

---

## 5. Logging and Debugging Practices

### Server-Side Logging
- **Logger Initialization**: Uses Python standard library logging:
  ```python
  import logging
  logger = logging.getLogger(__name__)
  ```
- **Levels Used**:
  - `logger.info()`: Important lifecycle milestones (model loaded, organization upgraded, user registered).
  - `logger.warning()`: Degraded operating modes (fallback to lexical scoring, SpaCy download retries, embedding generation failure).
  - `logger.error()`: Unhandled exceptions in route handlers, database rollbacks, webhook signature failures, external API errors.
- **Entrypoint / Startup Console Output**:
  - [`server/app.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/app.py) uses standard `print()` statements for core API booting status:
    ```python
    print("ResuMatch Core API Booting...")
    print("Database initialized successfully.")
    print(f"Running ResuMatch API (debug={debug_mode})...")
    ```
- **Debug Configuration**:
  - Sourced from the `FLASK_DEBUG` environment variable (legacy naming preserved from earlier Flask implementation):
    ```python
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ['true', '1', 't']
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=debug_mode)
    ```
  > [!WARNING]
  > On branch `check-pr`, lines 48 & 50 in `server/app.py` contain syntax errors (`'t"]` and extra closing parenthesis `)))`) introduced in commit `b47f8d9`. This breaks module execution and testing until reverted or corrected.

### Client-Side Logging
- Standard `console.error("Context description:", error)` across all failed network requests.
- No client-side observability, APM, or external error tracking library (such as Sentry or Datadog) is installed.

---

## 6. Common Idioms & Recurring Code Patterns

### 1. FastAPI Dependency Injection
Route handlers rely on standard FastAPI dependencies:
- **Database Session**: `db: Session = Depends(get_db)` provides a managed session yielding from [`server/utils/db.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/utils/db.py) and closing automatically on completion.
- **Strict Authentication**: `user: User = Depends(get_current_user)` validates the Bearer JWT token from the `Authorization` header, decodes user ID, queries the database, and raises 401 if missing or invalid.
- **Optional Authentication**: `user: User | None = Depends(get_current_user_optional)` attempts token extraction, returning `None` if unauthenticated without raising exceptions, allowing anonymous resume scans.

### 2. Multi-Tenant Organization Scoping
- Every user belongs to one or more organizations via the `Membership` junction model.
- Upon registration ([`server/routes/auth.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/routes/auth.py)), a default personal organization is created automatically:
  ```python
  personal_org = Organization(
      id=str(uuid.uuid4()),
      name=f"Personal Workspace ({email})",
      slug=f"personal-{email.split('@')[0]}-{str(uuid.uuid4())[:6]}"
  )
  ```
- User role is assigned as `"OWNER"`.
- Role verification for protected actions (e.g. member invitation or removal):
  ```python
  actor_membership = db.query(Membership).filter(
      Membership.organization_id == org_id,
      Membership.user_id == user.id,
      Membership.role.in_(["OWNER", "ADMIN"])
  ).first()
  ```

### 3. File Signature (Magic Bytes) Verification
To guard against file upload spoofing, [`server/routes/analyze.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/routes/analyze.py#L213-L239) inspects raw header bytes rather than trusting file extensions or MIME types:
- PDF files must start with `b'%PDF'`
- DOCX files must start with `b'PK\x03\x04'` (ZIP archive header)

### 4. Bounded In-Memory Caching
To prevent memory exhaustion during transformer embedding calculations, [`server/services/ai_engine.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/services/ai_engine.py) implements a thread-safe LRU cache using `OrderedDict` and `threading.Lock`:
- Max cache entries: 128.
- Cache key: 64-bit integer hash `hash(text)` rather than full string, preventing memory bloat.

### 5. Client State Initialization from Local Storage
The React client initializes authentication and theme state from browser `localStorage` using functional initializers to prevent redundant I/O:
```javascript
const [token, setToken] = useState(() => localStorage.getItem('token') || '');
const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');
const [darkMode, setDarkMode] = useState(() => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});
```
