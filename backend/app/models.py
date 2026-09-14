from __future__ import annotations

import datetime as dt

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Security(Base):
    """Master reference data for every ticker MII has held."""

    __tablename__ = "securities"

    ticker: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    sector: Mapped[str] = mapped_column(String(64))
    asset_class: Mapped[str] = mapped_column(String(32), default="Equity")

    holdings: Mapped[list["Holding"]] = relationship(back_populates="security")


class Snapshot(Base):
    """A single statement date (month-end NAV snapshot)."""

    __tablename__ = "snapshots"
    __table_args__ = (UniqueConstraint("date", name="uq_snapshot_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[dt.date] = mapped_column(Date, index=True)
    custodian: Mapped[str] = mapped_column(String(32))
    account_label: Mapped[str] = mapped_column(String(64))
    cash_value: Mapped[float] = mapped_column(Float)
    stocks_value: Mapped[float] = mapped_column(Float)
    total_value: Mapped[float] = mapped_column(Float)
    source_document: Mapped[str] = mapped_column(String(128), default="")
    # When set, overrides the naive (end-start) delta for this period's return
    # calculation -- used for the statement-reported true market P&L on a
    # period where a custodian transfer/large cash flow would otherwise
    # swamp the naive delta. See seed_data.py for why.
    market_change_override: Mapped[float | None] = mapped_column(Float, nullable=True)

    holdings: Mapped[list["Holding"]] = relationship(back_populates="snapshot", cascade="all, delete-orphan")


class Holding(Base):
    """A position in a given snapshot: quantity/price/value/cost basis for one ticker."""

    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("snapshots.id"), index=True)
    ticker: Mapped[str] = mapped_column(ForeignKey("securities.ticker"), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    market_value: Mapped[float] = mapped_column(Float)
    cost_basis: Mapped[float | None] = mapped_column(Float, nullable=True)
    unrealized_gain: Mapped[float | None] = mapped_column(Float, nullable=True)

    snapshot: Mapped["Snapshot"] = relationship(back_populates="holdings")
    security: Mapped["Security"] = relationship(back_populates="holdings")


class IncomeRecord(Base):
    """Monthly dividend/interest income, from each statement's income summary."""

    __tablename__ = "income_records"
    __table_args__ = (UniqueConstraint("month", name="uq_income_month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    month: Mapped[dt.date] = mapped_column(Date, index=True)
    dividends: Mapped[float] = mapped_column(Float, default=0.0)
    interest: Mapped[float] = mapped_column(Float, default=0.0)
    other: Mapped[float] = mapped_column(Float, default=0.0)


class ActivityEvent(Base):
    """Notable portfolio activity: transfers, custodian changes, new/closed positions."""

    __tablename__ = "activity_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[dt.date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(32))  # transfer, dividend, trade, custodian_change
    description: Mapped[str] = mapped_column(String(256))
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)


class PriceCache(Base):
    """Latest live quote fetched for a ticker, used to keep the dashboard current between statements."""

    __tablename__ = "price_cache"

    ticker: Mapped[str] = mapped_column(String(16), primary_key=True)
    price: Mapped[float] = mapped_column(Float)
    prev_close: Mapped[float | None] = mapped_column(Float, nullable=True)
    fetched_at: Mapped[dt.datetime] = mapped_column(DateTime)
    source: Mapped[str] = mapped_column(String(32), default="stooq")


class BenchmarkPrice(Base):
    """Historical monthly close for the benchmark index, cached from the live source."""

    __tablename__ = "benchmark_prices"
    __table_args__ = (UniqueConstraint("ticker", "date", name="uq_benchmark_ticker_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    date: Mapped[dt.date] = mapped_column(Date, index=True)
    close: Mapped[float] = mapped_column(Float)
