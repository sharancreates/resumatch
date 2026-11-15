---
phase: 10-student-pricing-and-referrals
plan: 01
status: completed
completed_at: 2026-11-15T10:26:00+05:30
files_modified:
  - server/models.py
  - server/alembic/versions/e4f3a2b1c0d9_add_student_passes_and_referrals.py
  - server/routes/billing.py
  - server/routes/referral.py
  - server/routes/auth.py
  - server/tests/test_student_pricing.py
  - server/tests/test_billing.py
---

# Plan 10-01 Execution Summary: Student Micro-Passes Backend & Viral Referral Engine

## 1. Overview
Replaced legacy recurring enterprise subscription models with student-centric micro-passes (`SPRINT_PASS` ₹199 / 14 days and `PLACEMENT_SEASON` ₹499 / 90 days), Razorpay UPI order creation and signature verification, and a viral peer referral engine ("Invite 3 friends -> unlock 7 days free Sprint Pass").

## 2. Changes Made
- **Database Schema & Models (`server/models.py`)**:
  - Added `referral_code` column (indexed, unique) to `User`.
  - Created `Referral` model linking `referrer_user_id` and `referred_user_id` with unique attribution.
  - Enhanced `User.is_premium` to recognize active `SPRINT_PASS` and `PLACEMENT_SEASON` subscriptions with timezone-safe expiry checks.
  - Added defaults for `current_period_start` and `current_period_end` on `Subscription`.
- **Alembic Migration (`server/alembic/versions/e4f3a2b1c0d9_add_student_passes_and_referrals.py`)**:
  - Adds `referral_code` column to `users` table with unique index.
  - Creates `referrals` table with foreign keys to `users.id` and cascade delete.
- **Student Billing API (`server/routes/billing.py`)**:
  - Defined `STUDENT_PLANS` catalog (`sprint_pass` ₹199 / 19900 paise / 14 days, `placement_season` ₹499 / 49900 paise / 90 days).
  - Updated `POST /api/billing/order` to accept `CreateOrderRequest(plan_id)` and calculate exact price in paise.
  - Updated `POST /api/billing/verify` to set pass plans and dynamically extend existing active durations.
  - Updated `POST /api/billing/mock-upgrade` to support plan selection and duration assignment in development.
  - Added `GET /api/billing/plans` returning available student passes, active pass details, and days remaining.
- **Viral Referral Engine (`server/routes/referral.py` & `auth.py`)**:
  - `generate_unique_referral_code`: Generates 7-character uppercase alphanumeric referral codes.
  - `POST /api/auth/register`: Accepts optional `referred_by_code`, attributes referral to referrer, and generates code for new user.
  - `process_referral_reward`: When 3 unrewarded referrals join, automatically unlocks or extends 7 days of free Sprint Pass for the referrer.
  - `GET /api/referrals/me`: Returns stats, shareable link, friends invited count, and progress towards next reward.
  - Registered `referral_router` in `server/app.py`.
- **Automated Tests (`server/tests/test_student_pricing.py` & `test_billing.py`)**:
  - Verified plan catalog, order creation for ₹199 and ₹499, pass durations (14d vs 90d), `User.is_premium` active vs. expired status, and referral milestone rewards (3 friends = 7 days free). All 7 new tests passed.

## 3. Verification
- `python -m py_compile` passed on all modified backend files.
- Pytest suite `server/tests/test_student_pricing.py` passed 7/7 tests in 1.85s.
- Full billing and templates test suite passed all 19 tests in 6.87s.

