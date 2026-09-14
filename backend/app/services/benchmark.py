"""Benchmark (e.g. S&P 500 / SPY) historical prices, for comparing MII's NAV
performance against the market -- the standard "vs. benchmark" chart every
hedge fund/endowment report includes.
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import logging

import httpx
from sqlalchemy.orm import Session

from app.models import BenchmarkPrice

logger = logging.getLogger("midas.benchmark")

STOOQ_HISTORY_URL = "https://stooq.com/q/d/l/?s={symbol}&d1={start}&d2={end}&i=d"
REQUEST_TIMEOUT = 10.0


def _stooq_symbol(ticker: str) -> str:
    return f"{ticker.lower()}.us"


def fetch_history(ticker: str, start: dt.date, end: dt.date) -> list[tuple[dt.date, float]]:
    """Fetches daily closes for `ticker` between start and end (inclusive). Best-effort."""
    url = STOOQ_HISTORY_URL.format(
        symbol=_stooq_symbol(ticker),
        start=start.strftime("%Y%m%d"),
        end=end.strftime("%Y%m%d"),
    )
    try:
        resp = httpx.get(url, timeout=REQUEST_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        reader = csv.DictReader(io.StringIO(resp.text))
        rows: list[tuple[dt.date, float]] = []
        for row in reader:
            if row.get("Close") in (None, "N/D", ""):
                continue
            rows.append((dt.datetime.strptime(row["Date"], "%Y-%m-%d").date(), float(row["Close"])))
        return rows
    except Exception as exc:  # noqa: BLE001 - defensive
        logger.warning("Benchmark history fetch failed for %s: %s", ticker, exc)
        return []


def ensure_benchmark_prices(db: Session, ticker: str, dates: list[dt.date]) -> None:
    """Makes sure BenchmarkPrice has a close for each date (or the nearest prior
    trading day) available, fetching+caching from Stooq if missing."""
    if not dates:
        return
    existing = {
        row.date
        for row in db.query(BenchmarkPrice).filter(BenchmarkPrice.ticker == ticker).all()
    }
    missing = [d for d in dates if d not in existing]
    if not missing:
        return

    start = min(missing) - dt.timedelta(days=10)
    end = max(missing)
    history = fetch_history(ticker, start, end)
    if not history:
        return

    history_by_date = dict(history)
    for target in missing:
        # snap to the closest trading day on/before the target date
        candidate = target
        close = None
        for _ in range(10):
            if candidate in history_by_date:
                close = history_by_date[candidate]
                break
            candidate -= dt.timedelta(days=1)
        if close is None:
            continue
        db.add(BenchmarkPrice(ticker=ticker, date=target, close=close))
    db.commit()


def get_benchmark_closes(db: Session, ticker: str, dates: list[dt.date]) -> dict[dt.date, float]:
    ensure_benchmark_prices(db, ticker, dates)
    rows = (
        db.query(BenchmarkPrice)
        .filter(BenchmarkPrice.ticker == ticker, BenchmarkPrice.date.in_(dates))
        .all()
    )
    return {row.date: row.close for row in rows}
