"""Add student referral code and referrals table

Revision ID: e4f3a2b1c0d9
Revises: d3e2f1a0b9c8
Create Date: 2026-11-15 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f3a2b1c0d9'
down_revision: Union[str, None] = 'd3e2f1a0b9c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add referral_code to users
    op.add_column('users', sa.Column('referral_code', sa.String(length=32), nullable=True))
    op.create_index('ix_users_referral_code', 'users', ['referral_code'], unique=True)

    # 2. Create referrals table
    op.create_table(
        'referrals',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('referrer_user_id', sa.String(length=36), nullable=False),
        sa.Column('referred_user_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='joined', nullable=False),
        sa.Column('reward_granted', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['referrer_user_id'], ['users.id'], name='referrals_referrer_user_id_fkey', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['referred_user_id'], ['users.id'], name='referrals_referred_user_id_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='referrals_pkey'),
        sa.UniqueConstraint('referred_user_id', name='uq_referrals_referred_user_id')
    )
    op.create_index('ix_referrals_referrer_user_id', 'referrals', ['referrer_user_id'])


def downgrade() -> None:
    # 1. Drop referrals table
    op.drop_index('ix_referrals_referrer_user_id', table_name='referrals')
    op.drop_table('referrals')

    # 2. Remove referral_code from users
    op.drop_index('ix_users_referral_code', table_name='users')
    op.drop_column('users', 'referral_code')
