from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Security
from app.security import require_auth
from app.services.prices import get_cached_prices, refresh_price_cache

router = APIRouter(prefix="/api/market", tags=["market"], dependencies=[Depends(require_auth)])


@router.get("/prices")
def current_prices(db: Session = Depends(get_db)):
    cache = get_cached_prices(db)
    return {
        ticker: {
            "price": row.price,
            "prev_close": row.prev_close,
            "fetched_at": row.fetched_at.isoformat(),
        }
        for ticker, row in cache.items()
    }


@router.post("/refresh")
def refresh_prices(db: Session = Depends(get_db)):
    tickers = [s.ticker for s in db.query(Security).all() if s.ticker != "CASH"]
    updated = refresh_price_cache(db, tickers)
    return {"requested": len(tickers), "updated": len(updated), "prices": updated}
