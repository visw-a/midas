"""Live quote fetching.

Uses Stooq's free, no-API-key CSV endpoints. Stooq is best-effort and can be
unreachable from some networks/sandboxes -- every call here is defensive: a
failure just means the caller falls back to the last cached price (and,
failing that, the most recent statement price), never a crash.
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import logging

import httpx
from sqlalchemy.orm import Session

from app.models import PriceCache

logger = logging.getLogger("midas.prices")

STOOQ_QUOTE_URL = "https://stooq.com/q/l/?s={symbol}&f=sd2t2ohlcv&h&e=csv"
REQUEST_TIMEOUT = 8.0


def _stooq_symbol(ticker: str) -> str:
    # Stooq US tickers are suffixed with ".us" (e.g. aapl.us). Non-US ADRs
    # like TSM still resolve fine on the composite US listing.
    return f"{ticker.lower()}.us"


def fetch_live_quote(ticker: str) -> tuple[float, float | None] | None:
    """Returns (last_price, prev_close) for a ticker, or None if unavailable."""
    url = STOOQ_QUOTE_URL.format(symbol=_stooq_symbol(ticker))
    try:
        resp = httpx.get(url, timeout=REQUEST_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        reader = csv.DictReader(io.StringIO(resp.text))
        row = next(reader, None)
        if not row or row.get("Close") in (None, "N/D", ""):
            return None
        close = float(row["Close"])
        return close, None
    except Exception as exc:  # noqa: BLE001 - defensive, any network/parse failure just falls back
        logger.warning("Live quote fetch failed for %s: %s", ticker, exc)
        return None


def refresh_price_cache(db: Session, tickers: list[str]) -> dict[str, float]:
    """Fetches live quotes for the given tickers and upserts them into PriceCache.

    Returns a dict of ticker -> price for whichever fetches succeeded.
    """
    updated: dict[str, float] = {}
    for ticker in tickers:
        result = fetch_live_quote(ticker)
        if result is None:
            continue
        price, prev_close = result
        cached = db.get(PriceCache, ticker)
        if cached is None:
            cached = PriceCache(ticker=ticker, price=price, prev_close=prev_close, fetched_at=dt.datetime.utcnow())
            db.add(cached)
        else:
            cached.prev_close = cached.price
            cached.price = price
            cached.fetched_at = dt.datetime.utcnow()
        updated[ticker] = price
    if updated:
        db.commit()
    return updated


def get_cached_prices(db: Session) -> dict[str, PriceCache]:
    return {row.ticker: row for row in db.query(PriceCache).all()}
