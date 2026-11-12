"""Add reports table and organization_id to usage_logs

Revision ID: c1a9d8e7f6b5
Revises: b8d95bb291f2
Create Date: 2026-11-12 19:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a9d8e7f6b5'
down_revision: Union[str, None] = 'b8d95bb291f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create reports table
    op.create_table(
        'reports',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.Column('analysis_ids', sa.JSON(), nullable=False),
        sa.Column('pdf_url', sa.String(length=256), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], name='reports_organization_id_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='reports_pkey')
    )

    # Add organization_id to usage_logs
    op.add_column('usage_logs', sa.Column('organization_id', sa.String(length=36), nullable=True))
    op.create_foreign_key(
        'usage_logs_organization_id_fkey',
        'usage_logs',
        'organizations',
        ['organization_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    # Drop foreign key and column from usage_logs
    op.drop_constraint('usage_logs_organization_id_fkey', 'usage_logs', type_='foreignkey')
    op.drop_column('usage_logs', 'organization_id')

    # Drop reports table
    op.drop_table('reports')

