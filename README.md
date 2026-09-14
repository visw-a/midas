# MII Portfolio Tracker

A private, hedge-fund-style monitoring dashboard for the McIntire Investment
Institute's brokerage portfolio. Seeded from actual monthly statements
(Vanguard, Jan–May 2026; Fidelity, Jul 2026 onward after an in-kind account
transfer) and kept current with live market quotes between statements.

**Stack:** FastAPI + SQLAlchemy/SQLite backend, React + TypeScript (Vite,
Tailwind, Recharts) frontend. No user accounts — a single shared password
gates the whole dashboard.

## What it does

- **Dashboard** — live NAV, day/period change, allocation, top holdings.
- **Holdings** — every position marked to market with live quotes (falls
  back to the last statement price when a quote isn't available), sortable.
- **Performance** — period returns, cumulative/annualized return, Sharpe
  ratio, annualized volatility, max drawdown, and beta vs. a benchmark
  (S&P 500 / SPY by default) — computed from statement-to-statement NAV.
- **Attribution** — per-position contribution to the portfolio's return for
  any period between two statements.
- **Risk** — sector exposure and single-name concentration vs. configurable
  policy limits (15% single name / 35% sector by default).
- **Activity** — dividend income and notable account events (trades,
  custodian transfers) pulled from the statements.

Live quotes come from Stooq's free, no-API-key endpoints and refresh on a
background timer (every 15 minutes by default); if that's ever unreachable,
every page still works off the last statement's prices — nothing crashes or
blocks on it.

## Data provenance

`backend/app/seed_data.py` is the single source of truth for historical
data, transcribed directly from the five brokerage statements it documents
(quantities, prices, cost basis, unrealized gain, and monthly dividend
income). There's a real gap in the record: no June 2026 statement was
available, and the account moved from Vanguard to Fidelity in late July, so
a couple of period returns span more than one month or are computed from
the custodian's own reported "change in investment value" rather than a
naive start/end delta (so the ~$799k transfer itself doesn't get counted as
a market gain). Both cases are flagged in the API response (`flow_adjusted`,
`note`) and shown in the UI. As new statements come in, add another entry to
`SNAPSHOTS` in `seed_data.py` — that's the whole update path for now (see
Roadmap below for turning this into a proper upload flow).

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit SITE_PASSWORD and SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

The SQLite database (`midas.db`) is created and seeded automatically on
first run.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL should point at the backend above
npm run dev
```

Visit the printed localhost URL and sign in with the `SITE_PASSWORD` you set.

## Deploying

The repo-root `Dockerfile` builds the frontend and copies it straight into
the FastAPI app, which serves it (`app/main.py` mounts `app/static` and
falls back to `index.html` for client-side routes). That means **one
service, one URL, no CORS wiring** — deploy the Dockerfile anywhere that
runs containers.

### Render (recommended — free tier, easiest path)

1. Push this repo to GitHub (already done if you're reading this on the
   `claude/mcintire-portfolio-tracker-cmzdp7` branch).
2. On [render.com](https://render.com), **New +** → **Blueprint**, pick this
   repo/branch. Render reads `render.yaml` and provisions everything.
3. It'll prompt for one value: `SITE_PASSWORD` (the shared password the club
   uses to log in). Everything else (a random `SECRET_KEY`, etc.) is filled
   in automatically.
4. Deploy. Render builds the Docker image and gives you a URL like
   `https://mii-portfolio-tracker.onrender.com` — that's the live site.

Free-tier services spin down after 15 minutes idle and take ~30–50s to wake
on the next visit; upgrade to a paid instance type later if that's annoying.
No database setup needed — SQLite lives in the container and reseeds itself
from `seed_data.py` on every start (see Data provenance above for why that's
safe: nothing writeable lives only in the DB).

### Anywhere else that runs Docker (Railway, Fly.io, a VM, etc.)

```bash
docker build -t midas .
docker run -p 8000:8000 \
  -e SITE_PASSWORD=your-password \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e COOKIE_SECURE=true \
  midas
```

Point the platform's health check at `/api/health`. Set `COOKIE_SECURE=true`
once it's served over HTTPS (required for the login cookie to work).

### Deploying frontend/backend as two separate services instead

Still possible if you'd rather (e.g. a static host for the frontend + a
separate API host): build the frontend with `VITE_API_URL` set to the
backend's URL, deploy `backend/` as its own Python service, and set
`CORS_ORIGINS` on the backend to the frontend's URL. The single-service
Docker path above is simpler and is what `render.yaml` sets up.

## Repo layout

```
backend/
  app/
    main.py            FastAPI app, CORS, startup seeding, scheduler
    models.py           SQLAlchemy tables
    seed_data.py         Statement-transcribed historical data (source of truth)
    seed.py              Loads seed_data.py into the DB on first run
    security.py          Password check + signed session cookie
    services/
      analytics.py        Returns, risk metrics, attribution, sector/concentration
      prices.py            Live quote fetch + cache (Stooq)
      benchmark.py         Benchmark (SPY) historical close fetch + cache
    routers/              auth / portfolio / market API routes
frontend/
  src/
    api/client.ts        Typed fetch wrapper + response types
    pages/                One file per dashboard page
    components/           Shared UI (Card, Layout/nav, stat tiles)
    context/AuthContext.tsx
```

## Roadmap ideas

- Upload a new statement PDF/CSV straight from the UI instead of hand-editing `seed_data.py`.
- Multi-user accounts with roles (analyst / PM / admin) if the single shared password stops being enough.
- Realized gain/loss and full trade-level transaction history (current data is monthly-statement-level).
- Configurable single-name/sector limits from the UI instead of constants in `analytics.py`.
