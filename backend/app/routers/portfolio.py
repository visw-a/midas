from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import ActivityEvent, IncomeRecord, Security, Snapshot
from app.security import require_auth
from app.services import analytics
from app.services.benchmark import get_benchmark_closes
from app.services.prices import get_cached_prices

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"], dependencies=[Depends(require_auth)])
settings = get_settings()


def _latest_snapshot(db: Session) -> Snapshot:
    snapshot = db.query(Snapshot).order_by(Snapshot.date.desc()).first()
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No portfolio data has been loaded yet")
    return snapshot


def _priced_holdings(db: Session, snapshot: Snapshot) -> list[dict]:
    """Holdings for a snapshot, marked-to-market with the latest cached live
    price when available (falling back to the statement price)."""
    holdings = analytics.get_holdings_for_snapshot(db, snapshot.id)
    securities = {s.ticker: s for s in db.query(Security).all()}
    live_prices = get_cached_prices(db)

    rows = []
    total_live_value = 0.0
    for h in holdings:
        sec = securities.get(h.ticker)
        live = live_prices.get(h.ticker)
        current_price = live.price if (live and h.ticker != "CASH") else h.price
        day_change_pct = None
        if live and live.prev_close and h.ticker != "CASH":
            day_change_pct = (live.price - live.prev_close) / live.prev_close
        live_market_value = h.quantity * current_price
        total_live_value += live_market_value
        unrealized_gain = (live_market_value - h.cost_basis) if h.cost_basis is not None else h.unrealized_gain
        rows.append(
            {
                "ticker": h.ticker,
                "name": sec.name if sec else h.ticker,
                "sector": sec.sector if sec else "Unknown",
                "asset_class": sec.asset_class if sec else "Equity",
                "quantity": h.quantity,
                "statement_price": h.price,
                "current_price": current_price,
                "is_live_price": bool(live and h.ticker != "CASH"),
                "price_as_of": live.fetched_at.isoformat() if (live and h.ticker != "CASH") else snapshot.date.isoformat(),
                "day_change_pct": day_change_pct,
                "market_value": live_market_value,
                "statement_market_value": h.market_value,
                "cost_basis": h.cost_basis,
                "unrealized_gain": unrealized_gain,
            }
        )

    for row in rows:
        row["weight"] = row["market_value"] / total_live_value if total_live_value else 0.0

    rows.sort(key=lambda r: r["market_value"], reverse=True)
    return rows


@router.get("/summary")
def portfolio_summary(db: Session = Depends(get_db)):
    snapshot = _latest_snapshot(db)
    rows = _priced_holdings(db, snapshot)
    live_total = sum(r["market_value"] for r in rows)
    cash_row = next((r for r in rows if r["ticker"] == "CASH"), None)
    cash_value = cash_row["market_value"] if cash_row else 0.0
    stocks_value = live_total - cash_value

    snapshots = analytics.get_snapshots(db)
    periods = analytics.compute_period_returns(snapshots)
    last_period = periods[-1] if periods else None

    return {
        "as_of_statement": snapshot.date.isoformat(),
        "custodian": snapshot.custodian,
        "account_label": snapshot.account_label,
        "statement_total_value": snapshot.total_value,
        "live_total_value": live_total,
        "change_since_statement": live_total - snapshot.total_value,
        "change_since_statement_pct": (live_total - snapshot.total_value) / snapshot.total_value if snapshot.total_value else 0.0,
        "cash_value": cash_value,
        "stocks_value": stocks_value,
        "cash_weight": cash_value / live_total if live_total else 0.0,
        "stocks_weight": stocks_value / live_total if live_total else 0.0,
        "num_positions": len([r for r in rows if r["ticker"] != "CASH"]),
        "last_period_return": last_period.return_pct if last_period else None,
        "last_period_note": last_period.note if last_period else None,
    }


@router.get("/holdings")
def portfolio_holdings(db: Session = Depends(get_db)):
    snapshot = _latest_snapshot(db)
    return {"as_of_statement": snapshot.date.isoformat(), "holdings": _priced_holdings(db, snapshot)}


@router.get("/history")
def portfolio_history(db: Session = Depends(get_db)):
    snapshots = analytics.get_snapshots(db)
    return {
        "snapshots": [
            {
                "date": s.date.isoformat(),
                "custodian": s.custodian,
                "total_value": s.total_value,
                "cash_value": s.cash_value,
                "stocks_value": s.stocks_value,
            }
            for s in snapshots
        ]
    }


@router.get("/performance")
def portfolio_performance(db: Session = Depends(get_db)):
    snapshots = analytics.get_snapshots(db)
    periods = analytics.compute_period_returns(snapshots)

    benchmark_ticker = settings.benchmark_ticker
    dates = [s.date for s in snapshots]
    closes = get_benchmark_closes(db, benchmark_ticker, dates)

    benchmark_period_returns: list[float] = []
    benchmark_rows = []
    for prev_s, curr_s in zip(snapshots, snapshots[1:]):
        c0, c1 = closes.get(prev_s.date), closes.get(curr_s.date)
        months = max((curr_s.date.year - prev_s.date.year) * 12 + (curr_s.date.month - prev_s.date.month), 1)
        if c0 and c1:
            period_ret = (c1 - c0) / c0
            monthly_ret = (1 + period_ret) ** (1 / months) - 1
        else:
            period_ret = None
            monthly_ret = None
        benchmark_period_returns.append(monthly_ret if monthly_ret is not None else 0.0)
        benchmark_rows.append({"date": curr_s.date.isoformat(), "return_pct": period_ret})

    have_full_benchmark = all(v is not None for v in [closes.get(d) for d in dates])
    risk = analytics.risk_metrics(periods, benchmark_period_returns if have_full_benchmark else None)

    return {
        "benchmark_ticker": benchmark_ticker,
        "benchmark_available": have_full_benchmark,
        "periods": [
            {
                "start_date": p.start_date.isoformat(),
                "end_date": p.end_date.isoformat(),
                "start_value": p.start_value,
                "end_value": p.end_value,
                "return_pct": p.return_pct,
                "months_elapsed": p.months_elapsed,
                "flow_adjusted": p.flow_adjusted,
                "note": p.note,
            }
            for p in periods
        ],
        "benchmark_periods": benchmark_rows,
        "cumulative_return": analytics.cumulative_return(periods) if periods else None,
        "risk_metrics": risk,
    }


@router.get("/attribution")
def portfolio_attribution(
    db: Session = Depends(get_db),
    period_end: str | None = Query(default=None, description="ISO date of the period's end snapshot"),
):
    snapshots = analytics.get_snapshots(db)
    if len(snapshots) < 2:
        raise HTTPException(status_code=404, detail="Need at least two statements to compute attribution")

    if period_end:
        try:
            target = dt.date.fromisoformat(period_end)
        except ValueError:
            raise HTTPException(status_code=400, detail="period_end must be an ISO date") from None
        idx = next((i for i, s in enumerate(snapshots) if s.date == target), None)
        if idx is None or idx == 0:
            raise HTTPException(status_code=404, detail="No prior snapshot found for that period_end")
    else:
        idx = len(snapshots) - 1

    prev, curr = snapshots[idx - 1], snapshots[idx]
    rows = analytics.attribution(db, prev, curr)
    return {
        "start_date": prev.date.isoformat(),
        "end_date": curr.date.isoformat(),
        "flow_adjusted_period": curr.market_change_override is not None,
        "available_periods": [s.date.isoformat() for s in snapshots[1:]],
        "attribution": rows,
    }


@router.get("/risk")
def portfolio_risk(db: Session = Depends(get_db)):
    snapshot = _latest_snapshot(db)
    return {
        "as_of_statement": snapshot.date.isoformat(),
        "sector_exposure": analytics.sector_exposure(db, snapshot),
        "concentration": analytics.concentration(db, snapshot),
        "single_name_limit": analytics.SINGLE_NAME_LIMIT,
        "sector_limit": analytics.SECTOR_LIMIT,
    }


@router.get("/activity")
def portfolio_activity(db: Session = Depends(get_db)):
    income = db.query(IncomeRecord).order_by(IncomeRecord.month.asc()).all()
    events = db.query(ActivityEvent).order_by(ActivityEvent.date.asc()).all()

    feed = [
        {
            "date": r.month.isoformat(),
            "category": "dividend",
            "description": f"Dividend & interest income received (${r.dividends:,.2f} dividends).",
            "amount": r.dividends + r.interest + r.other,
        }
        for r in income
    ] + [
        {"date": e.date.isoformat(), "category": e.category, "description": e.description, "amount": e.amount}
        for e in events
    ]
    feed.sort(key=lambda r: r["date"])
    return {"activity": feed}
