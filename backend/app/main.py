from __future__ import annotations

import datetime as dt
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import Security
from app.routers import auth, market, portfolio
from app.seed import seed_if_empty
from app.services.prices import refresh_price_cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("midas")

settings = get_settings()
scheduler = BackgroundScheduler()


def _refresh_job() -> None:
    db = SessionLocal()
    try:
        tickers = [s.ticker for s in db.query(Security).all() if s.ticker != "CASH"]
        updated = refresh_price_cache(db, tickers)
        logger.info("Live price refresh: %d/%d tickers updated", len(updated), len(tickers))
    except Exception:  # noqa: BLE001 - background job must never crash the process
        logger.exception("Scheduled price refresh failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()

    # Run on APScheduler's own background thread, not inline here: this
    # coroutine blocks the ASGI startup event (and therefore the app
    # binding to its port / answering health checks) until it returns, and
    # _refresh_job makes ~2 blocking HTTP calls per ticker. Scheduling it
    # with next_run_time=now still fires it immediately, just without
    # holding up startup.
    scheduler.add_job(
        _refresh_job,
        "interval",
        minutes=settings.price_refresh_minutes,
        id="price_refresh",
        next_run_time=dt.datetime.now(),
    )
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(title="MII Portfolio Tracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(market.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# When the frontend's production build has been copied into app/static (see
# the repo-root Dockerfile), serve it from this same process -- one deployed
# service, one URL, no CORS wiring needed between two hosts. In local dev
# (running the frontend separately via `npm run dev`) this directory won't
# exist, so none of this registers and nothing changes.
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.is_dir():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
