---
phase: 04-razorpay-billing
plan: 01
status: completed
completed_at: 2026-11-13T10:41:00+05:30
files_modified:
  - server/models.py
  - prisma/schema.prisma
  - server/alembic/versions/d3e2f1a0b9c8_add_razorpay_and_payment_table.py
  - server/routes/billing.py
---

# Plan 04-01 Execution Summary: Razorpay Models, Migrations & Payment Endpoints

## 1. Overview
Aligned database models and Alembic migrations with Razorpay (replacing Stripe requirements), created the `Payment` ledger entity, implemented Razorpay payment order generation (`/api/billing/order`) with role-based access control (`OWNER` or `ADMIN`), and implemented cryptographic HMAC SHA-256 signature verification (`/api/billing/verify`) to upgrade subscriptions to PRO.

## 2. Changes Made
- **`server/models.py`**:
  - In `Subscription`: Added `payment_provider` (default `'RAZORPAY'`), `razorpay_customer_id`, `razorpay_subscription_id`, and made `stripe_customer_id` nullable.
  - Added `Payment` model with `id`, `organization_id`, `razorpay_payment_id`, `razorpay_order_id`, `amount`, `currency`, `status`, `created_at`, `to_dict()`, and foreign key to `organizations.id` with `cascade='all, delete-orphan'`.
  - In `Organization`: Added `payments` relationship back-populating `Payment.organization`.
- **`prisma/schema.prisma`**:
  - Updated `Subscription` with `paymentProvider`, `razorpayCustomerId`, `razorpaySubscriptionId`, and optional `stripeCustomerId`.
  - Added `Payment` model with relations to `Organization`.
- **`server/alembic/versions/d3e2f1a0b9c8_add_razorpay_and_payment_table.py`**:
  - Forward migration altering `subscriptions.stripe_customer_id` to nullable, adding Razorpay columns, and creating the `payments` table with unique constraint on `razorpay_payment_id`.
  - Verified cleanly as Alembic head `d3e2f1a0b9c8`.
- **`server/routes/billing.py`**:
  - Implemented `verify_razorpay_signature` utility verifying HMAC SHA-256 of `order_id|payment_id` against `RAZORPAY_KEY_SECRET`.
  - Implemented `POST /api/billing/order`: Restricted to organization `OWNER` or `ADMIN` via `TenantContext`. Returns Razorpay order with `PRO_PRICE_INR_PAISE` (₹499) and organization metadata, or mock order fallback if keys are unconfigured.
  - Implemented `POST /api/billing/verify`: Cryptographically validates signature, provides idempotency check on `Payment.razorpay_payment_id`, upgrades subscription to `plan="PRO"`, records captured `Payment`, and logs `AuditLog` entry.
  - Implemented `POST /api/billing/checkout-session` as backward-compatible wrapper delegating to order creation.

## 3. Verification
- `python -m py_compile` passed on `server/models.py` and `server/routes/billing.py`.
- `python -m alembic heads` resolved head `d3e2f1a0b9c8`.
- In-memory signature verification unit test verified valid and tampered signature checks.
- RBAC guard confirmed 403 Forbidden for `VIEWER` roles and permitted for `ADMIN`/`OWNER`.

