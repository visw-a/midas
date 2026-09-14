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

- **Backend**: any host that runs a long-lived Python process (Render,
  Railway, Fly.io, a plain VM). Set `SITE_PASSWORD`, `SECRET_KEY` (use
  `openssl rand -hex 32`), `CORS_ORIGINS` (your deployed frontend URL), and
  `COOKIE_SECURE=true` once it's served over HTTPS. SQLite is fine at this
  scale; swap `DATABASE_URL` for Postgres if you outgrow it.
- **Frontend**: any static host (Vercel, Netlify, Cloudflare Pages). Set
  `VITE_API_URL` to the deployed backend's URL at build time.

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
