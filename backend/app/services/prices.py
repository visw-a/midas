"""Live quote fetching.

Tries Stooq's free, no-API-key CSV endpoint first, then falls back to
Yahoo Finance's public chart endpoint (also free, no key) if Stooq doesn't
return usable data -- some hosts block requests that look automated (e.g.
httpx's default `python-httpx/x.x` User-Agent), so both requests send a
normal browser User-Agent. Either provider can be flaky or unreachable from
some networks; every call here is defensive: a failure just means the
caller falls back to the last cached price (and, failing that, the most
recent statement price), never a crash.
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
YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
REQUEST_TIMEOUT = 8.0

# A plain httpx client identifies itself as "python-httpx/x.x.x", which some
# providers silently block (often as a 404 rather than 403). A normal
# browser User-Agent avoids that.
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
}


def _stooq_symbol(ticker: str) -> str:
    # Stooq US tickers are suffixed with ".us" (e.g. aapl.us). Non-US ADRs
    # like TSM still resolve fine on the composite US listing.
    return f"{ticker.lower()}.us"


def _fetch_stooq(ticker: str) -> tuple[float, float | None] | None:
    url = STOOQ_QUOTE_URL.format(symbol=_stooq_symbol(ticker))
    resp = httpx.get(url, timeout=REQUEST_TIMEOUT, follow_redirects=True, headers=REQUEST_HEADERS)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))
    row = next(reader, None)
    if not row or row.get("Close") in (None, "N/D", ""):
        return None
    return float(row["Close"]), None


def _fetch_yahoo(ticker: str) -> tuple[float, float | None] | None:
    url = YAHOO_QUOTE_URL.format(symbol=ticker.upper())
    resp = httpx.get(url, timeout=REQUEST_TIMEOUT, follow_redirects=True, headers=REQUEST_HEADERS)
    resp.raise_for_status()
    payload = resp.json()
    result = (payload.get("chart") or {}).get("result") or []
    if not result:
        return None
    meta = result[0].get("meta") or {}
    price = meta.get("regularMarketPrice")
    prev_close = meta.get("previousClose") or meta.get("chartPreviousClose")
    if price is None:
        return None
    return float(price), (float(prev_close) if prev_close is not None else None)


def fetch_live_quote(ticker: str) -> tuple[float, float | None] | None:
    """Returns (last_price, prev_close) for a ticker, or None if both providers fail."""
    for name, fetcher in (("stooq", _fetch_stooq), ("yahoo", _fetch_yahoo)):
        try:
            result = fetcher(ticker)
            if result is not None:
                return result
        except Exception as exc:  # noqa: BLE001 - defensive, any network/parse failure tries the next provider
            logger.warning("Live quote fetch via %s failed for %s: %s", name, ticker, exc)
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
