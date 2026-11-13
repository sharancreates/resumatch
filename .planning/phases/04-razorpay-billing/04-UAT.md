# Phase 4: Razorpay Billing Lifecycle & Access Guardrails — User Acceptance Testing (UAT)

## Overview
- **Phase**: 04-razorpay-billing
- **Date**: 2026-11-13
- **Status**: PASSED (5/5 tests verified)

---

## Test Results

| Test ID | Description | Expected Outcome | Status |
| :--- | :--- | :--- | :---: |
| **UAT-04-01** | Razorpay Database Models & Alembic Migration | `Subscription` model contains Razorpay fields; `Payment` ledger model is mapped; forward migration resolves cleanly to Alembic head `d3e2f1a0b9c8` | PASSED |
| **UAT-04-02** | Razorpay Order Creation & RBAC Enforcement | `POST /api/billing/order` restricts initiation to organization `OWNER` or `ADMIN` (blocks `VIEWER` with HTTP 403) and returns order with ₹499 PRO pricing | PASSED |
| **UAT-04-03** | Cryptographic HMAC SHA-256 Payment Signature Verification | `POST /api/billing/verify` validates HMAC SHA-256 signature using `RAZORPAY_KEY_SECRET`, rejects tampered signatures with HTTP 400, checks idempotency, and upgrades org to PRO | PASSED |
| **UAT-04-04** | Asynchronous Webhook Processing with Signature Verification | `POST /api/billing/webhook` verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` and handles lifecycle events (`order.paid`, `payment.captured`, `subscription.cancelled`) | PASSED |
| **UAT-04-05** | Production Security Guardrails (Mock Upgrade & JWT Secret) | `POST /api/billing/mock-upgrade` is blocked with HTTP 403 in production; default `SECRET_KEY` triggers `RuntimeError` if detected in production | PASSED |

---

## Sign-off
- All Phase 4 Razorpay billing and security guardrails verified and accepted.
- Ready for Phase 5: Production Hardening, Caching & ML Concurrency.

