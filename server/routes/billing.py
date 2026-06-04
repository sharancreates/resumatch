from flask import Blueprint, request, jsonify, g, current_app
from utils.auth_helper import token_required
from models import db, User
import stripe
import os
import logging

logger = logging.getLogger(__name__)

billing_bp = Blueprint('billing', __name__)

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

@billing_bp.route('/checkout-session', methods=['POST'])
@token_required
def create_checkout_session():
    try:
        price_id = os.environ.get('STRIPE_PRICE_ID')
        domain_url = os.environ.get('CLIENT_URL', 'http://localhost:5173')
        
        # Fallback to mock session details if Stripe credentials are unset
        if not stripe.api_key or not price_id:
            return jsonify({
                "status": "mock",
                "message": "Stripe credentials not configured. Please use mock upgrade.",
                "mock_url": f"{domain_url}/?upgrade=mock"
            })

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{domain_url}/?upgrade=success",
            cancel_url=f"{domain_url}/?upgrade=cancel",
            client_reference_id=str(g.user.id),
            customer_email=g.user.email
        )
        return jsonify({"status": "success", "url": session.url})
    except Exception as e:
        logger.error(f"Stripe Session Creation Error: {str(e)}")
        return jsonify({"error": "Failed to initiate transaction session."}), 500

@billing_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('STRIPE_SIGNATURE')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

    if not webhook_secret:
        return jsonify({"error": "Webhook secret not configured"}), 400

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except Exception as e:
        logger.error(f"Webhook Signature Verification Failed: {str(e)}")
        return jsonify({"error": "Signature invalid."}), 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        if user_id:
            try:
                user = User.query.get(int(user_id))
                if user:
                    user.is_premium = True
                    db.session.commit()
                    logger.info(f"User {user_id} upgraded to premium via Stripe Checkout.")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to update user status in webhook: {str(e)}")

    return jsonify({"status": "success"})

@billing_bp.route('/mock-upgrade', methods=['POST'])
@token_required
def mock_upgrade():
    if not current_app.debug:
        return jsonify({"error": "Operation forbidden in production environment."}), 403
    try:
        user = User.query.get(g.user.id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        user.is_premium = True
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "User upgraded to Premium successfully!",
            "user": user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Mock Upgrade Error: {str(e)}")
        return jsonify({"error": "Mock upgrade operation failed."}), 500
