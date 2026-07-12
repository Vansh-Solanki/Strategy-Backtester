"""add tickers table

Revision ID: a1b2c3d4e5f6
Revises: 3e13fb4e9561
Create Date: 2026-07-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3e13fb4e9561'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tickers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('symbol', sa.String(length=10), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('exchange', sa.String(length=50), nullable=True),
        sa.Column('cik', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tickers_symbol'), 'tickers', ['symbol'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_tickers_symbol'), table_name='tickers')
    op.drop_table('tickers')
