---
phase: 04-razorpay-billing
plan: 02
status: completed
completed_at: 2026-11-13T10:41:30+05:30
files_modified:
  - server/routes/billing.py
  - server/routes/auth.py
  - server/routes/teams.py
  - server/utils/auth_helper.py
  - server/tests/test_billing.py
  - server/tests/__init__.py
---

# Plan 04-02 Execution Summary: Razorpay Webhooks & Production Security Guardrails

## 1. Overview
Implemented asynchronous Razorpay webhook handling with cryptographic HMAC SHA-256 signature verification, enforced production guardrails preventing unauthorized mock upgrades, secured JWT secrets against default dev keys in production environments, updated default subscription initializers to Razorpay, and created unit tests.

## 2. Changes Made
- **`server/routes/billing.py`**:
  - Implemented `verify_webhook_signature` verifying raw request payload against `X-Razorpay-Signature` using `RAZORPAY_WEBHOOK_SECRET`.
  - Implemented `POST /api/billing/webhook`:
    - Validates signature and parses lifecycle events (`order.paid`, `payment.captured`, `subscription.cancelled`, `payment.failed`).
    - Updates `Subscription` status and period, and creates `Payment` records idempotently.
  - Implemented production guardrail on `POST /api/billing/mock-upgrade`: Checks `ENVIRONMENT` or `FASTAPI_ENV` and rejects with HTTP 403 Forbidden in production.
- **`server/utils/auth_helper.py`**:
  - Implemented `validate_secret_key()`: Raises `RuntimeError("Critical Security Error: Production environment requires an explicitly set SECRET_KEY.")` if `ENVIRONMENT == "production"` and the default development secret is detected.
  - Integrated into token encoding and decoding.
- **`server/routes/auth.py` & `server/routes/teams.py`**:
  - Updated default subscription initializers upon user registration and organization creation to set `payment_provider="RAZORPAY"`.
- **`server/tests/test_billing.py` & `server/tests/__init__.py`**:
  - Added unit test suite covering:
    1. Razorpay payment signature HMAC SHA-256 validation (pass on valid, fail on tampering or empty parameters).
    2. Webhook payload HMAC SHA-256 signature verification (pass on authentic payload, fail on tampered payload or signature).
    3. Production environment blocking for `/api/billing/mock-upgrade` (assert HTTP 403).
    4. Production `SECRET_KEY` integrity guardrail (assert `RuntimeError` on dev default, pass on explicit prod secret).
    5. Billing order RBAC check (assert HTTP 403 for non-admin/non-owner).

## 3. Verification
- `python -m py_compile` passed on all modified server files.
- All in-memory unit tests in `test_billing.py` executed and passed:
  - `Guardrail 1 passed: Default key blocked in prod`
  - `Guardrail 2 passed: Mock upgrade blocked in prod`
  - `SUCCESS: All in-memory billing tests passed!`
