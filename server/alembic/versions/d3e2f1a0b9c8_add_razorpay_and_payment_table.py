"""Add Razorpay subscription fields and payments table

Revision ID: d3e2f1a0b9c8
Revises: c1a9d8e7f6b5
Create Date: 2026-11-12 21:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e2f1a0b9c8'
down_revision: Union[str, None] = 'c1a9d8e7f6b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update subscriptions table for Razorpay
    op.alter_column('subscriptions', 'stripe_customer_id', existing_type=sa.String(length=100), nullable=True)
    op.add_column('subscriptions', sa.Column('payment_provider', sa.String(length=50), server_default='RAZORPAY', nullable=True))
    op.add_column('subscriptions', sa.Column('razorpay_customer_id', sa.String(length=100), nullable=True))
    op.add_column('subscriptions', sa.Column('razorpay_subscription_id', sa.String(length=100), nullable=True))
    op.create_unique_constraint('uq_subscriptions_razorpay_sub', 'subscriptions', ['razorpay_subscription_id'])

    # 2. Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('razorpay_payment_id', sa.String(length=100), nullable=True),
        sa.Column('razorpay_order_id', sa.String(length=100), nullable=True),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='payments_organization_id_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='payments_pkey')
    )
    op.create_unique_constraint('uq_payments_razorpay_payment_id', 'payments', ['razorpay_payment_id'])


def downgrade() -> None:
    # 1. Drop payments table
    op.drop_table('payments')

    # 2. Revert subscriptions table changes
    op.drop_constraint('uq_subscriptions_razorpay_sub', 'subscriptions', type_='unique')
    op.drop_column('subscriptions', 'razorpay_subscription_id')
    op.drop_column('subscriptions', 'razorpay_customer_id')
    op.drop_column('subscriptions', 'payment_provider')
    op.alter_column('subscriptions', 'stripe_customer_id', existing_type=sa.String(length=100), nullable=False)
