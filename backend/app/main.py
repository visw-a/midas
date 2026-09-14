from __future__ import annotations

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

    scheduler.add_job(
        _refresh_job,
        "interval",
        minutes=settings.price_refresh_minutes,
        id="price_refresh",
        next_run_time=None,  # fire once on startup below, then on the interval
    )
    scheduler.start()
    _refresh_job()  # populate the cache immediately instead of waiting a full interval

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

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
