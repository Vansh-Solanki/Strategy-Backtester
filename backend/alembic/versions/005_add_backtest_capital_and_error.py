"""add backtest initial_capital and error_message

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-10 00:00:03.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "backtests",
        sa.Column("initial_capital", sa.Numeric(12, 4), nullable=False, server_default="10000"),
    )
    op.add_column("backtests", sa.Column("error_message", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("backtests", "error_message")
    op.drop_column("backtests", "initial_capital")
