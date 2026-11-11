# ResuMatch AI — Testing Strategy & Test Suite Documentation

This document provides a comprehensive guide to the testing frameworks, suite organization, execution commands, fixture patterns, test coverage status, known gaps, and testing conventions for the ResuMatch codebase.

---

## 1. Testing Frameworks & Tools

### Backend (Server)
- **Primary Framework**: `pytest` (version 7.4.3 / 9.0.2 compatible, installed in `server/env`).
- **HTTP Test Client**: `fastapi.testclient.TestClient` (built on Starlette / `httpx`).
- **Asynchronous Runner**: `anyio` (version 4.13.0 plugin loaded with pytest).
- **Configuration**:
  - No dedicated `pytest.ini`, `setup.cfg`, or `pyproject.toml` configuration files exist in the repository.
  - Tests rely on default pytest discovery rules (locating files matching `test_*.py` in `server/tests/`).
- **Python Runtime**: Python 3.11 (`cpython-311` site-packages located in `server/env/Lib/site-packages`).

### Frontend (Client)
- **Status**: **No testing framework installed**.
- `client/package.json` contains no test runner dependencies (no Jest, Vitest, React Testing Library, Cypress, or Playwright).
- There is no `"test"` script defined in `client/package.json` (only `"dev"`, `"build"`, `"lint"`, and `"preview"`).
- There are no test files in `client/src/` or `client/tests/`.

---

## 2. Test Suite Organization & Test Types

All existing automated tests reside under [`server/tests/`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/):

```
server/tests/
├── test_parser.py        # Unit tests: Regex contact parsing & section segmentation
├── test_scoring.py       # Unit tests: Lexical & semantic scoring algorithms
├── test_robustness.py    # Integration tests: Magic bytes signature validation
└── test_storage.py       # Integration tests: File upload/download & static serving
```

### Detailed Suite Breakdown

| Test File | Type | Target Module | Description & Key Assertions |
| :--- | :--- | :--- | :--- |
| [`test_parser.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_parser.py) | **Unit** | [`utils/resume_parser.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/utils/resume_parser.py) | • `test_parse_contact_details()`: Verifies regex extraction of email addresses, phone numbers, and LinkedIn URLs from raw text.<br/>• `test_segment_resume()`: Verifies resume section header segmentation (`skills`, `experience`, `education`). |
| [`test_scoring.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_scoring.py) | **Unit** | [`services/ai_engine.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/services/ai_engine.py) | • `test_exact_match()`: Asserts high match score (`>= 80%` when semantic model loaded, `>= 40%` on lexical fallback) and empty missing keywords list.<br/>• `test_missing_keywords()`: Asserts detection of missing tech keywords (`react`, `postgresql`, `database`).<br/>• `test_empty_inputs()`: Verifies zero division resilience on empty strings (`score == 0.0`).<br/>• `test_punctuation_and_case_insensitivity()`: Confirms punctuation and uppercase characters do not decrease lexical scores (`lexical == 100.0`). |
| [`test_robustness.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_robustness.py) | **Integration** | [`routes/analyze.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/routes/analyze.py) (`/api/parse-pdf`) | • `test_upload_magic_bytes_pdf_validation()`: Uploads text bytes pretending to be `application/pdf`, asserts HTTP 400 and `"Invalid file signature"`.<br/>• `test_upload_magic_bytes_docx_validation()`: Uploads text bytes disguised as DOCX, asserts HTTP 400 and `"Invalid file signature"`. |
| [`test_storage.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_storage.py) | **Integration** | [`utils/storage.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/utils/storage.py) & [`routes/analyze.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/routes/analyze.py) | • `test_storage_local_upload_and_download()`: Uploads mock file bytes to local disk, retrieves them using `download_file()`, and cleans up disk artifacts.<br/>• `test_parse_pdf_and_upload()`: Posts a valid minimal PDF stream (`%PDF-1.4...`) to `/api/parse-pdf`, verifies response `file_url`, requests the served file via `GET /api/uploads/{filename}`, and validates byte identity. |

---

## 3. How to Run Tests

### Running Backend Tests

#### Option A: Running with Active Python 3.11 Environment (Recommended on Windows)
When running from the repository root in PowerShell, set the `PYTHONPATH` to include the `server` directory and its virtual environment `site-packages`:

```powershell
# Set PYTHONPATH to include server code and installed dependencies
$env:PYTHONPATH="c:\Users\Sharanya Nagar\Desktop\Projects\resumatch\server;c:\Users\Sharanya Nagar\Desktop\Projects\resumatch\server\env\Lib\site-packages"

# Run all test suites
& "C:\Users\Sharanya Nagar\AppData\Local\Programs\Python\Python311\python.exe" -m pytest server/tests -v

# Run a specific unit test file (e.g. parser tests)
& "C:\Users\Sharanya Nagar\AppData\Local\Programs\Python\Python311\python.exe" -m pytest server/tests/test_parser.py -v

# Run with keyword filter
& "C:\Users\Sharanya Nagar\AppData\Local\Programs\Python\Python311\python.exe" -m pytest server/tests -k "scoring or parser"
```

#### Option B: Running from within the `server/` Directory
If running within an activated virtual environment:
```bash
cd server
pytest tests/ -v
```

> [!WARNING]
> **Active Execution Blocker on Branch `check-pr`**:
> Commit `b47f8d9` introduced intentional or accidental syntax errors in [`server/app.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/app.py#L48-L50):
> ```python
> debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ['true', '1', 't"]
> uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=debug_mode)))
> ```
> Because [`test_robustness.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_robustness.py#L3) and [`test_storage.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_storage.py#L4) import `from app import app`, running pytest across the entire directory currently fails during module import.
> Running [`test_parser.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_parser.py) independently succeeds (`2 passed in 0.05s`).

### Running Frontend Checks

Because no frontend unit test runner is configured, frontend validation is limited to linting and production build verification:

```bash
cd client

# Check code for syntax and React Hook rule compliance
npm run lint

# Verify full production build compilation
npm run build
```

---

## 4. Fixture & Mocking Patterns

### Current Mocking Patterns in Use

1. **FastAPI `TestClient`**:
   Integration tests instantiate `TestClient(app)` directly at module level:
   ```python
   from fastapi.testclient import TestClient
   from app import app

   client = TestClient(app)
   ```
2. **Synthetic Binary Stream Payloads**:
   Tests construct binary streams in memory rather than reading physical sample documents from disk:
   - *Minimal Valid PDF Signature*:
     ```python
     pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
     ```
   - *Invalid / Spoofed Files*:
     ```python
     files={"file": ("resume.pdf", b"Hello world, I am pretending to be a PDF resume.", "application/pdf")}
     ```
3. **Dynamic Model Loading Assertions**:
   In [`test_scoring.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/tests/test_scoring.py#L10-L15), tests avoid strict mocking of heavy PyTorch / ONNX models by querying `is_model_loaded()` at runtime:
   ```python
   if is_model_loaded():
       assert score >= 80.0
   else:
       # Lexical weight is 0.4, resulting in 40.0 baseline score
       assert score >= 40.0
   ```
4. **Manual Filesystem Teardown**:
   When tests write files to [`LOCAL_UPLOAD_DIR`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/utils/storage.py#L10), they manually clean up created files within the test body using `os.remove(local_path)`:
   ```python
   local_filename = file_url.split("/")[-1]
   local_path = os.path.join(LOCAL_UPLOAD_DIR, local_filename)
   if os.path.exists(local_path):
       os.remove(local_path)
   ```

### Missing Fixture Infrastructure
- **No `conftest.py`**: Shared pytest fixtures are completely absent.
- **No Database Fixtures**: Tests do not isolate database state. Any test invoking database writes modifies the local SQLite database file directly.
- **No Dependency Overrides**: FastAPI's `app.dependency_overrides` mechanism is not used, preventing isolated testing of authenticated endpoints.
- **No Third-Party Mocking**: External services like Stripe, Google Gemini, and AWS S3 lack structured unit test mocks.

---

## 5. Test Coverage Status & Major Gaps

### Summary Table

| Layer | Module / Area | Test Files | Estimated Coverage | Gap Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | Parser Utilities (`pdf_parser`, `docx_parser`, `resume_parser`) | `test_parser.py`, `test_robustness.py` | ~85% | Low |
| **Backend** | AI Engine & Scoring (`ai_engine.py`) | `test_scoring.py` | ~70% | Medium (Heavy transformer inference unmocked) |
| **Backend** | Storage Helpers (`storage.py`) | `test_storage.py` | ~80% | Low |
| **Backend** | Auth Routes (`routes/auth.py`) | None | 0% | **High** (No register, login, me, token tests) |
| **Backend** | Teams & RBAC (`routes/teams.py`) | None | 0% | **High** (No org, membership, API key tests) |
| **Backend** | Billing Routes (`routes/billing.py`) | None | 0% | **High** (No Stripe webhook or upgrade tests) |
| **Backend** | Analysis Routes (`routes/analyze.py`) | `test_robustness.py` (partial) | ~15% | **High** (Scan limits, history, PDF export untested) |
| **Frontend** | React Components & State (`client/src/`) | None | 0% | **High** (No UI or component tests) |
| **CI/CD** | Automated Pipeline Testing | None | 0% | **Critical** (CI only runs AI review; runs zero tests) |

### Detailed Backend Gaps

1. **Authentication & Authorization (`routes/auth.py`)**:
   - Registration validation: Malformed emails, short passwords (<6 chars), duplicate emails.
   - Login flow: Invalid password, missing user, token expiration.
   - Profile update: Partial updates, unauthorized updates.
2. **Multi-Tenancy & Teams (`routes/teams.py`)**:
   - Organization CRUD: Creating organizations, slug collision handling.
   - Role-Based Access Control (RBAC): Ensuring only `OWNER` or `ADMIN` can invite or remove members; ensuring `ADMIN` cannot remove `OWNER`.
   - Developer API keys: Key generation, prefix hashing, rate limit defaults, revocation.
3. **Billing & Subscriptions (`routes/billing.py`)**:
   - Stripe checkout session creation fallback to mock upgrade.
   - Webhook processing: Validating Stripe signatures, handling `checkout.session.completed`, idempotency.
   - Mock upgrade: Verifying plan transition from `FREE` to `PRO`.
4. **Analysis Pipeline Edge Cases (`routes/analyze.py`)**:
   - Enforcing the 10-scan free tier limit for non-premium users.
   - Multi-tenant isolation for `/api/history` and history deletion.
   - PDF export endpoint generating valid PDF binaries via ReportLab.
   - Gemini API bullet suggestion failure handling.

### Detailed Frontend Gaps
- Zero component unit tests for:
  - [`ResumeDropzone.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/ResumeDropzone.jsx): Drag-and-drop file handling, format restriction checks.
  - [`ResultDisplay.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/ResultDisplay.jsx): Rendering breakdown scores, missing keyword pills, PDF report download trigger.
  - [`AuthModal.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/AuthModal.jsx): Tab switching between login/register, field validation, submission state.
  - [`HistoryDrawer.jsx`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/client/src/components/HistoryDrawer.jsx): History list rendering, score color coding, selection callbacks.

---

## 6. Recommendations for Testing New Features

### 1. Immediate Blocker Fix: Repair `server/app.py`
Restore lines 48 & 50 in [`server/app.py`](file:///c:/Users/Sharanya%20Nagar/Desktop/Projects/resumatch/server/app.py) so the test suite can execute cleanly:
```python
if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ['true', '1', 't']
    print(f"Running ResuMatch API (debug={debug_mode})...")
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=debug_mode)
```

### 2. Introduce `server/tests/conftest.py` with Test Fixtures
Create a standard `conftest.py` providing an isolated in-memory SQLite database, clean session lifecycles, and a pre-configured `TestClient`:

```python
# server/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import app
from models import Base, User, Organization, Membership, Subscription
from utils.db import get_db
from utils.auth_helper import encode_auth_token

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
```

### 3. Add Authenticated User Fixtures
To test protected endpoints in `routes/teams.py` and `routes/billing.py`, create reusable fixtures generating test tokens:

```python
@pytest.fixture
def auth_headers(db_session):
    import uuid
    user = User(
        id=str(uuid.uuid4()),
        email="testuser@example.com",
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    token = encode_auth_token(user.id)
    return {"Authorization": f"Bearer {token}", "User": user}
```

### 4. Setup Frontend Testing with Vitest + React Testing Library
To eliminate the 100% gap on the client side:
1. Install testing packages:
   ```bash
   cd client
   npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
   ```
2. Configure `vite.config.js`:
   ```javascript
   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: './src/setupTests.js',
     },
   });
   ```
3. Add `"test": "vitest run"` and `"test:watch": "vitest"` to `client/package.json`.

### 5. Establish CI Automated Test Execution
Add a test execution step to `.github/workflows/` (e.g. `.github/workflows/test.yml`) so that pull requests run pytest and linting prior to merging:
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd server
          pip install -r requirements.txt pytest
      - name: Run Pytest
        run: |
          cd server
          python -m pytest tests/ -v

  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install client dependencies
        run: |
          cd client
          npm ci
      - name: Run ESLint
        run: |
          cd client
          npm run lint
```
