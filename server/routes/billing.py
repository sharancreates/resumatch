import os
import json
import uuid
import hmac
import hashlib
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Header, status
from sqlalchemy.orm import Session
from models import User, Organization, Membership, Subscription, Payment, AuditLog
from utils.db import get_db
from utils.auth_helper import get_current_user, get_current_organization, TenantContext

logger = logging.getLogger(__name__)

billing_router = APIRouter(prefix="/api/billing", tags=["billing"])

PRO_PRICE_INR_PAISE = 49900  # ₹499 in paise


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str, secret: str) -> bool:
    """Verifies HMAC SHA-256 payment signature returned by Razorpay Checkout."""
    if not secret or not order_id or not payment_id or not signature:
        return False
    message = f"{order_id}|{payment_id}".encode("utf-8")
    generated_signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated_signature, signature)


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verifies HMAC SHA-256 signature on raw webhook payload."""
    if not secret or not signature or not payload:
        return False
    computed_signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed_signature, signature)


@billing_router.post('/order')
def create_billing_order(
    tenant: TenantContext = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    Creates a Razorpay order for upgrading the organization to the PRO plan.
    Restricted to organization OWNER or ADMIN.
    """
    if not tenant.membership or not tenant.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active organization workspace not found."
        )

    # RBAC check: Only OWNER or ADMIN may initiate billing orders
    if tenant.membership.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization owners and admins can initiate billing orders."
        )

    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    domain_url = os.environ.get("CLIENT_URL", "http://localhost:5173")

    # Fallback to mock order details if Razorpay credentials are unset
    if not key_id or not key_secret:
        return {
            "status": "mock",
            "message": "Razorpay credentials not configured. Please use mock upgrade.",
            "mock_url": f"{domain_url}/?upgrade=mock",
            "amount": PRO_PRICE_INR_PAISE,
            "currency": "INR"
        }

    try:
        receipt_id = f"rcpt_{tenant.organization_id[:8]}_{int(datetime.now(timezone.utc).timestamp())}"
        order_payload = {
            "amount": PRO_PRICE_INR_PAISE,
            "currency": "INR",
            "receipt": receipt_id,
            "notes": {
                "organization_id": tenant.organization_id,
                "user_id": tenant.membership.user_id
            }
        }

        resp = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(key_id, key_secret),
            json=order_payload,
            timeout=10
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Razorpay API error: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=502, detail="Failed to create Razorpay payment order.")

        order_data = resp.json()
        return {
            "status": "success",
            "order_id": order_data.get("id"),
            "amount": order_data.get("amount", PRO_PRICE_INR_PAISE),
            "currency": order_data.get("currency", "INR"),
            "key_id": key_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Razorpay Order Creation Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate transaction order.")


@billing_router.post('/checkout-session')
def create_checkout_session(
    tenant: TenantContext = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    Backward-compatible endpoint delegating to Razorpay order creation.
    """
    return create_billing_order(tenant=tenant, db=db)


@billing_router.post('/verify')
def verify_payment(
    req: RazorpayVerifyRequest,
    tenant: TenantContext = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    Verifies Razorpay payment signature and upgrades organization subscription to PRO.
    """
    if not tenant.membership or not tenant.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active organization workspace not found."
        )

    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay secret key not configured."
        )

    # Validate HMAC SHA-256 signature
    is_valid = verify_razorpay_signature(
        order_id=req.razorpay_order_id,
        payment_id=req.razorpay_payment_id,
        signature=req.razorpay_signature,
        secret=key_secret
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay payment signature."
        )

    try:
        # Idempotency check: check if payment record already processed
        existing_pmt = db.query(Payment).filter(
            Payment.razorpay_payment_id == req.razorpay_payment_id
        ).first()

        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        # Update or create subscription
        sub = db.query(Subscription).filter(
            Subscription.organization_id == tenant.organization_id
        ).first()

        if not sub:
            sub = Subscription(
                id=str(uuid.uuid4()),
                organization_id=tenant.organization_id,
                payment_provider="RAZORPAY",
                plan="PRO",
                status="active",
                current_period_start=now,
                current_period_end=period_end
            )
            db.add(sub)
        else:
            sub.payment_provider = "RAZORPAY"
            sub.plan = "PRO"
            sub.status = "active"
            sub.current_period_start = now
            sub.current_period_end = period_end

        # Create payment receipt record if not already existing
        if not existing_pmt:
            pmt = Payment(
                id=str(uuid.uuid4()),
                organization_id=tenant.organization_id,
                razorpay_payment_id=req.razorpay_payment_id,
                razorpay_order_id=req.razorpay_order_id,
                amount=PRO_PRICE_INR_PAISE,
                currency="INR",
                status="captured",
                created_at=now
            )
            db.add(pmt)

        # Create audit log record
        audit = AuditLog(
            id=str(uuid.uuid4()),
            organization_id=tenant.organization_id,
            actor_id=tenant.membership.user_id,
            action="UPGRADE_SUBSCRIPTION",
            target_type="SUBSCRIPTION",
            target_id=sub.id,
            created_at=now
        )
        db.add(audit)

        db.commit()

        return {
            "status": "success",
            "message": "Subscription upgraded to PRO successfully!",
            "subscription": {
                "plan": sub.plan,
                "status": sub.status,
                "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Payment Verification Commit Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record payment verification."
        )


@billing_router.post('/webhook')
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Asynchronous Razorpay webhook handler. Validates HMAC SHA-256 signature
    against RAZORPAY_WEBHOOK_SECRET and processes lifecycle events.
    """
    payload = await request.body()
    sig_header = request.headers.get("X-Razorpay-Signature")
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET")

    if not webhook_secret:
        raise HTTPException(status_code=400, detail="Webhook secret not configured.")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header.")

    if not verify_webhook_signature(payload, sig_header, webhook_secret):
        logger.error("Razorpay webhook signature verification failed.")
        raise HTTPException(status_code=400, detail="Signature invalid.")

    try:
        event_data = json.loads(payload.decode("utf-8"))
        event_type = event_data.get("event")
        now = datetime.now(timezone.utc)

        if event_type in ["order.paid", "payment.captured"]:
            payment_entity = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            order_entity = event_data.get("payload", {}).get("order", {}).get("entity", {})
            notes = payment_entity.get("notes") or order_entity.get("notes") or {}

            org_id = notes.get("organization_id")
            payment_id = payment_entity.get("id")
            order_id = payment_entity.get("order_id") or order_entity.get("id")
            amount = payment_entity.get("amount", PRO_PRICE_INR_PAISE)

            if org_id:
                # Idempotent payment check
                existing_pmt = db.query(Payment).filter(Payment.razorpay_payment_id == payment_id).first()
                if not existing_pmt and payment_id:
                    new_pmt = Payment(
                        id=str(uuid.uuid4()),
                        organization_id=org_id,
                        razorpay_payment_id=payment_id,
                        razorpay_order_id=order_id,
                        amount=amount,
                        currency="INR",
                        status="captured",
                        created_at=now
                    )
                    db.add(new_pmt)

                sub = db.query(Subscription).filter(Subscription.organization_id == org_id).first()
                if not sub:
                    sub = Subscription(
                        id=str(uuid.uuid4()),
                        organization_id=org_id,
                        payment_provider="RAZORPAY",
                        plan="PRO",
                        status="active",
                        current_period_start=now,
                        current_period_end=now + timedelta(days=30)
                    )
                    db.add(sub)
                else:
                    sub.payment_provider = "RAZORPAY"
                    sub.plan = "PRO"
                    sub.status = "active"
                    sub.current_period_start = now
                    sub.current_period_end = now + timedelta(days=30)

                db.commit()
                logger.info(f"Organization {org_id} upgraded to PRO via Razorpay webhook ({event_type}).")

        elif event_type in ["subscription.cancelled", "payment.failed"]:
            payment_entity = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            order_entity = event_data.get("payload", {}).get("order", {}).get("entity", {})
            notes = payment_entity.get("notes") or order_entity.get("notes") or {}
            org_id = notes.get("organization_id")

            if org_id:
                sub = db.query(Subscription).filter(Subscription.organization_id == org_id).first()
                if sub:
                    sub.status = "canceled" if event_type == "subscription.cancelled" else "past_due"
                    db.commit()
                    logger.info(f"Organization {org_id} subscription updated to {sub.status} via webhook.")

        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process Razorpay webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed.")


@billing_router.post('/mock-upgrade')
def mock_upgrade(
    tenant: TenantContext = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    Mock upgrade for development and testing.
    Security guardrail: Explicitly blocked in production environments.
    """
    env = (os.environ.get("ENVIRONMENT") or os.environ.get("FASTAPI_ENV") or "").lower()
    if env == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock upgrades are disabled in production."
        )

    if not tenant.membership or not tenant.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active workspace organization not found."
        )

    try:
        org_id = tenant.organization_id
        now = datetime.now(timezone.utc)
        sub_record = db.query(Subscription).filter(Subscription.organization_id == org_id).first()

        if not sub_record:
            sub_record = Subscription(
                id=str(uuid.uuid4()),
                organization_id=org_id,
                payment_provider="RAZORPAY",
                razorpay_customer_id=f"cust_mock_{str(uuid.uuid4())[:8]}",
                razorpay_subscription_id=f"sub_mock_{str(uuid.uuid4())[:8]}",
                plan="PRO",
                status="active",
                current_period_start=now,
                current_period_end=now + timedelta(days=30)
            )
            db.add(sub_record)
        else:
            sub_record.payment_provider = "RAZORPAY"
            sub_record.plan = "PRO"
            sub_record.status = "active"
            sub_record.current_period_start = now
            sub_record.current_period_end = now + timedelta(days=30)

        # Audit log entry for mock upgrade
        audit = AuditLog(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            actor_id=tenant.membership.user_id,
            action="UPGRADE_SUBSCRIPTION_MOCK",
            target_type="SUBSCRIPTION",
            target_id=sub_record.id,
            created_at=now
        )
        db.add(audit)

        db.commit()
        return {
            "status": "success",
            "message": "User upgraded to Premium successfully!",
            "subscription": {
                "plan": sub_record.plan,
                "status": sub_record.status,
                "current_period_end": sub_record.current_period_end.isoformat()
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Mock Upgrade Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Mock upgrade operation failed.")
