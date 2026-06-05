import os
import stripe
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Header
from sqlalchemy.orm import Session
from models import User, Organization, Membership, Subscription
from utils.db import get_db
from utils.auth_helper import get_current_user

logger = logging.getLogger(__name__)

billing_router = APIRouter(prefix="/api/billing", tags=["billing"])

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

@billing_router.post('/checkout-session')
def create_checkout_session(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        price_id = os.environ.get('STRIPE_PRICE_ID')
        domain_url = os.environ.get('CLIENT_URL', 'http://localhost:5173')
        
        # Fallback to mock session details if Stripe credentials are unset
        if not stripe.api_key or not price_id:
            return {
                "status": "mock",
                "message": "Stripe credentials not configured. Please use mock upgrade.",
                "mock_url": f"{domain_url}/?upgrade=mock"
            }

        # Find user's active organization (first workspace membership)
        membership = db.query(Membership).filter(Membership.user_id == user.id).first()
        if not membership:
            raise HTTPException(status_code=404, detail="Workspace organization not found.")

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{domain_url}/?upgrade=success",
            cancel_url=f"{domain_url}/?upgrade=cancel",
            client_reference_id=str(user.id),
            customer_email=user.email,
            metadata={
                "organization_id": membership.organization_id
            }
        )
        return {"status": "success", "url": session.url}
    except Exception as e:
        logger.error(f"Stripe Session Creation Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate transaction session.")

@billing_router.post('/webhook')
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

    if not webhook_secret:
        raise HTTPException(status_code=400, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except Exception as e:
        logger.error(f"Webhook Signature Verification Failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Signature invalid.")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        org_id = session.get('metadata', {}).get('organization_id')
        customer_id = session.get('customer')
        sub_id = session.get('subscription')

        if org_id:
            try:
                # Update subscription details
                sub_record = db.query(Subscription).filter(Subscription.organization_id == org_id).first()
                if not sub_record:
                    sub_record = Subscription(
                        id=str(uuid.uuid4()),
                        organization_id=org_id,
                        stripe_customer_id=customer_id,
                        stripe_subscription_id=sub_id,
                        plan="PRO",
                        status="active",
                        current_period_start=datetime.now(timezone.utc),
                        current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
                    )
                    db.add(sub_record)
                else:
                    sub_record.plan = "PRO"
                    sub_record.status = "active"
                    sub_record.stripe_customer_id = customer_id
                    sub_record.stripe_subscription_id = sub_id
                    sub_record.current_period_start = datetime.now(timezone.utc)
                    sub_record.current_period_end = datetime.now(timezone.utc) + timedelta(days=30)
                
                db.commit()
                logger.info(f"Organization {org_id} upgraded to PRO via Stripe checkout.")
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to update subscription in webhook: {str(e)}")

    return {"status": "success"}

@billing_router.post('/mock-upgrade')
def mock_upgrade(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Fetch the user's active membership organization
        membership = db.query(Membership).filter(Membership.user_id == user.id).first()
        if not membership:
            raise HTTPException(status_code=404, detail="Active workspace organization not found.")
        
        org_id = membership.organization_id
        
        sub_record = db.query(Subscription).filter(Subscription.organization_id == org_id).first()
        if not sub_record:
            sub_record = Subscription(
                id=str(uuid.uuid4()),
                organization_id=org_id,
                stripe_customer_id=f"cus_mock_{str(uuid.uuid4())[:8]}",
                stripe_subscription_id=f"sub_mock_{str(uuid.uuid4())[:8]}",
                plan="PRO",
                status="active",
                current_period_start=datetime.now(timezone.utc),
                current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
            )
            db.add(sub_record)
        else:
            sub_record.plan = "PRO"
            sub_record.status = "active"
            sub_record.current_period_start = datetime.now(timezone.utc)
            sub_record.current_period_end = datetime.now(timezone.utc) + timedelta(days=30)

        db.commit()
        return {
            "status": "success",
            "message": "User upgraded to Premium successfully!",
            "user": user.to_dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Mock Upgrade Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Mock upgrade operation failed.")
