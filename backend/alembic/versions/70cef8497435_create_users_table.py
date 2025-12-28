"""create_users_table

Revision ID: 70cef8497435
Revises:
Create Date: 2025-12-27 16:23:27.375246

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '70cef8497435'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users table."""
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('nango_connection_id', sa.Text(), nullable=False),
        sa.Column('atlassian_account_id', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Create indexes
    op.create_index(
        op.f('ix_users_nango_connection_id'),
        'users',
        ['nango_connection_id'],
        unique=True
    )
    op.create_index(
        op.f('ix_users_atlassian_account_id'),
        'users',
        ['atlassian_account_id'],
        unique=False
    )


def downgrade() -> None:
    """Drop users table."""
    op.drop_index(op.f('ix_users_atlassian_account_id'), table_name='users')
    op.drop_index(op.f('ix_users_nango_connection_id'), table_name='users')
    op.drop_table('users')
