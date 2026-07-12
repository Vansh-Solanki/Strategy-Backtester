"""add price_history table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-11 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'price_history',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('ticker_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('open', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('high', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('low', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('close', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('adj_close', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('volume', sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(['ticker_id'], ['tickers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ticker_id', 'date', name='uq_ticker_date'),
    )
    op.execute(
        "CREATE INDEX ix_price_history_date ON price_history USING brin (date)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_price_history_date")
    op.drop_table('price_history')
