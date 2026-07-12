from datetime import date as date_type

from sqlalchemy import BigInteger, Date, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PriceHistory(Base):
    __tablename__ = "price_history"
    __table_args__ = (UniqueConstraint("ticker_id", "date", name="uq_ticker_date"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ticker_id: Mapped[int] = mapped_column(ForeignKey("tickers.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    open: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    high: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    low: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    close: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    adj_close: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)

    ticker: Mapped["Ticker"] = relationship(back_populates="price_history")
