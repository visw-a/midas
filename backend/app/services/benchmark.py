"""Benchmark (e.g. S&P 500 / SPY) historical prices, for comparing MII's NAV
performance against the market -- the standard "vs. benchmark" chart every
hedge fund/endowment report includes.

Tries Stooq first, then falls back to Yahoo Finance's public chart endpoint
if Stooq doesn't return usable data. See services/prices.py for why both
requests send a normal browser User-Agent.
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import logging

import httpx
from sqlalchemy.orm import Session

from app.models import BenchmarkPrice
from app.services.prices import REQUEST_HEADERS

logger = logging.getLogger("midas.benchmark")

STOOQ_HISTORY_URL = "https://stooq.com/q/d/l/?s={symbol}&d1={start}&d2={end}&i=d"
YAHOO_HISTORY_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1d"
REQUEST_TIMEOUT = 10.0


def _stooq_symbol(ticker: str) -> str:
    return f"{ticker.lower()}.us"


def _fetch_stooq_history(ticker: str, start: dt.date, end: dt.date) -> list[tuple[dt.date, float]]:
    url = STOOQ_HISTORY_URL.format(
        symbol=_stooq_symbol(ticker),
        start=start.strftime("%Y%m%d"),
        end=end.strftime("%Y%m%d"),
    )
    resp = httpx.get(url, timeout=REQUEST_TIMEOUT, follow_redirects=True, headers=REQUEST_HEADERS)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))
    rows: list[tuple[dt.date, float]] = []
    for row in reader:
        if row.get("Close") in (None, "N/D", ""):
            continue
        rows.append((dt.datetime.strptime(row["Date"], "%Y-%m-%d").date(), float(row["Close"])))
    return rows


def _fetch_yahoo_history(ticker: str, start: dt.date, end: dt.date) -> list[tuple[dt.date, float]]:
    start_ts = int(dt.datetime.combine(start, dt.time.min, tzinfo=dt.timezone.utc).timestamp())
    end_ts = int(dt.datetime.combine(end + dt.timedelta(days=1), dt.time.min, tzinfo=dt.timezone.utc).timestamp())
    url = YAHOO_HISTORY_URL.format(symbol=ticker.upper(), start=start_ts, end=end_ts)
    resp = httpx.get(url, timeout=REQUEST_TIMEOUT, follow_redirects=True, headers=REQUEST_HEADERS)
    resp.raise_for_status()
    payload = resp.json()
    result = (payload.get("chart") or {}).get("result") or []
    if not result:
        return []
    timestamps = result[0].get("timestamp") or []
    closes = ((result[0].get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    rows: list[tuple[dt.date, float]] = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        rows.append((dt.datetime.fromtimestamp(ts, tz=dt.timezone.utc).date(), float(close)))
    return rows


def fetch_history(ticker: str, start: dt.date, end: dt.date) -> list[tuple[dt.date, float]]:
    """Fetches daily closes for `ticker` between start and end (inclusive). Best-effort."""
    for name, fetcher in (("stooq", _fetch_stooq_history), ("yahoo", _fetch_yahoo_history)):
        try:
            rows = fetcher(ticker, start, end)
            if rows:
                return rows
        except Exception as exc:  # noqa: BLE001 - defensive, any network/parse failure tries the next provider
            logger.warning("Benchmark history fetch via %s failed for %s: %s", name, ticker, exc)
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
