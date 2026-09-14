"""Portfolio analytics: returns, risk metrics, attribution, sector/concentration
risk. Computed from the statement-derived NAV/holdings snapshots stored in
the database -- the same building blocks a fund's risk desk would use, just
with a much smaller sample (one point per statement).
"""

from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass

import numpy as np
from sqlalchemy.orm import Session

from app.models import Holding, Security, Snapshot

RISK_FREE_RATE_ANNUAL = 0.04  # simplifying assumption; roughly the recent cash-sweep yield
SINGLE_NAME_LIMIT = 0.15  # flag any position over 15% of NAV as a concentration risk
SECTOR_LIMIT = 0.35  # flag any sector over 35% of NAV


@dataclass
class PeriodReturn:
    start_date: dt.date
    end_date: dt.date
    start_value: float
    end_value: float
    return_pct: float
    months_elapsed: float
    flow_adjusted: bool
    note: str | None


def get_snapshots(db: Session) -> list[Snapshot]:
    return db.query(Snapshot).order_by(Snapshot.date.asc()).all()


def get_holdings_for_snapshot(db: Session, snapshot_id: int) -> list[Holding]:
    return db.query(Holding).filter(Holding.snapshot_id == snapshot_id).all()


def compute_period_returns(snapshots: list[Snapshot]) -> list[PeriodReturn]:
    periods: list[PeriodReturn] = []
    for prev, curr in zip(snapshots, snapshots[1:]):
        months_elapsed = max(
            (curr.date.year - prev.date.year) * 12 + (curr.date.month - prev.date.month), 1
        )
        flow_adjusted = curr.market_change_override is not None
        note = None
        if flow_adjusted:
            change = curr.market_change_override
            return_pct = change / prev.total_value if prev.total_value else 0.0
            note = (
                "Custodian transfer occurred during this period; return reflects the "
                "statement-reported market change in investment value, excluding the "
                "transfer itself."
            )
        else:
            return_pct = (curr.total_value - prev.total_value) / prev.total_value if prev.total_value else 0.0
        if months_elapsed > 1:
            gap_note = f"Spans {months_elapsed} months; no statement available for the interim month(s)."
            note = f"{note} {gap_note}" if note else gap_note

        periods.append(
            PeriodReturn(
                start_date=prev.date,
                end_date=curr.date,
                start_value=prev.total_value,
                end_value=curr.total_value,
                return_pct=return_pct,
                months_elapsed=months_elapsed,
                flow_adjusted=flow_adjusted,
                note=note,
            )
        )
    return periods


def cumulative_return(periods: list[PeriodReturn]) -> float:
    total = 1.0
    for p in periods:
        total *= 1 + p.return_pct
    return total - 1.0


def annualize_return(total_return: float, total_months: float) -> float:
    if total_months <= 0:
        return 0.0
    years = total_months / 12
    return (1 + total_return) ** (1 / years) - 1 if years > 0 else 0.0


def monthly_normalized_returns(periods: list[PeriodReturn]) -> list[float]:
    """Converts each (possibly multi-month) period return into an equivalent
    single-month return, so volatility/Sharpe are on a common monthly basis."""
    normalized = []
    for p in periods:
        months = p.months_elapsed
        monthly = (1 + p.return_pct) ** (1 / months) - 1 if months > 0 else p.return_pct
        normalized.append(monthly)
    return normalized


def risk_metrics(periods: list[PeriodReturn], benchmark_periods: list[float] | None) -> dict:
    if len(periods) < 2:
        return {
            "annualized_volatility": None,
            "sharpe_ratio": None,
            "max_drawdown": None,
            "beta": None,
            "sample_size": len(periods),
            "note": "Not enough historical periods yet for meaningful risk statistics.",
        }

    monthly_returns = np.array(monthly_normalized_returns(periods))
    vol_monthly = float(np.std(monthly_returns, ddof=1)) if len(monthly_returns) > 1 else 0.0
    annualized_vol = vol_monthly * math.sqrt(12)

    total_return = cumulative_return(periods)
    total_months = sum(p.months_elapsed for p in periods)
    ann_return = annualize_return(total_return, total_months)

    sharpe = (ann_return - RISK_FREE_RATE_ANNUAL) / annualized_vol if annualized_vol > 0 else None

    # Max drawdown from the raw NAV path (statement dates only).
    values = [periods[0].start_value] + [p.end_value for p in periods]
    peak = values[0]
    max_dd = 0.0
    for v in values:
        peak = max(peak, v)
        if peak > 0:
            dd = (v - peak) / peak
            max_dd = min(max_dd, dd)

    beta = None
    if benchmark_periods and len(benchmark_periods) == len(monthly_returns) and len(monthly_returns) > 1:
        bench = np.array(benchmark_periods)
        if np.std(bench) > 0:
            cov = np.cov(monthly_returns, bench, ddof=1)[0][1]
            beta = float(cov / np.var(bench, ddof=1))

    return {
        "annualized_volatility": annualized_vol,
        "annualized_return": ann_return,
        "cumulative_return": total_return,
        "sharpe_ratio": sharpe,
        "max_drawdown": max_dd,
        "beta": beta,
        "risk_free_rate": RISK_FREE_RATE_ANNUAL,
        "sample_size": len(periods),
        "note": (
            "Computed from statement-to-statement snapshots only "
            f"({len(periods)} periods) -- treat as directional, not statistically robust, "
            "until more months of history accumulate."
        ),
    }


def benchmark_series(db: Session, snapshots: list[Snapshot], ticker: str) -> dict:
    """Aligns a benchmark's closes to the snapshot dates. Returns both the raw
    per-period return (for cumulative/annualized benchmark return) and the
    monthly-normalized return (for volatility/beta/tracking-error, on the
    same common monthly basis risk_metrics uses for the portfolio itself)."""
    from app.services.benchmark import get_benchmark_closes  # local import avoids a module-level cycle

    dates = [s.date for s in snapshots]
    closes = get_benchmark_closes(db, ticker, dates)
    raw_returns: list[float | None] = []
    monthly_returns: list[float] = []
    rows = []
    for prev_s, curr_s in zip(snapshots, snapshots[1:]):
        c0, c1 = closes.get(prev_s.date), closes.get(curr_s.date)
        months = max((curr_s.date.year - prev_s.date.year) * 12 + (curr_s.date.month - prev_s.date.month), 1)
        if c0 and c1:
            period_ret = (c1 - c0) / c0
            monthly_ret = (1 + period_ret) ** (1 / months) - 1
        else:
            period_ret = None
            monthly_ret = None
        raw_returns.append(period_ret)
        monthly_returns.append(monthly_ret if monthly_ret is not None else 0.0)
        rows.append({"date": curr_s.date.isoformat(), "return_pct": period_ret})

    available = len(dates) > 0 and all(closes.get(d) is not None for d in dates)
    return {"raw_returns": raw_returns, "monthly_returns": monthly_returns, "rows": rows, "available": available}


def sector_exposure(db: Session, snapshot: Snapshot) -> list[dict]:
    holdings = get_holdings_for_snapshot(db, snapshot.id)
    securities = {s.ticker: s for s in db.query(Security).all()}
    totals: dict[str, float] = {}
    for h in holdings:
        sec = securities.get(h.ticker)
        sector = sec.sector if sec else "Unknown"
        totals[sector] = totals.get(sector, 0.0) + h.market_value

    total_value = snapshot.total_value or 1.0
    rows = [
        {
            "sector": sector,
            "market_value": value,
            "weight": value / total_value,
            "over_limit": (value / total_value) > SECTOR_LIMIT,
        }
        for sector, value in totals.items()
    ]
    rows.sort(key=lambda r: r["weight"], reverse=True)
    return rows


def concentration(db: Session, snapshot: Snapshot) -> list[dict]:
    holdings = get_holdings_for_snapshot(db, snapshot.id)
    securities = {s.ticker: s for s in db.query(Security).all()}
    total_value = snapshot.total_value or 1.0
    rows = []
    for h in holdings:
        sec = securities.get(h.ticker)
        weight = h.market_value / total_value
        rows.append(
            {
                "ticker": h.ticker,
                "name": sec.name if sec else h.ticker,
                "weight": weight,
                "market_value": h.market_value,
                # Cash isn't a single-name concentration risk in the PM-policy sense.
                "over_limit": weight > SINGLE_NAME_LIMIT if h.ticker != "CASH" else False,
            }
        )
    rows.sort(key=lambda r: r["weight"], reverse=True)
    return rows


def attribution(db: Session, prev: Snapshot, curr: Snapshot) -> list[dict]:
    """Per-holding contribution to the portfolio's total return between two
    consecutive, flow-free snapshots (start_value weighted % of prior NAV)."""
    prev_holdings = {h.ticker: h for h in get_holdings_for_snapshot(db, prev.id)}
    curr_holdings = {h.ticker: h for h in get_holdings_for_snapshot(db, curr.id)}
    securities = {s.ticker: s for s in db.query(Security).all()}

    tickers = set(prev_holdings) | set(curr_holdings)
    total_start = prev.total_value or 1.0
    rows = []
    for ticker in tickers:
        if ticker == "CASH":
            continue
        start_mv = prev_holdings[ticker].market_value if ticker in prev_holdings else 0.0
        end_mv = curr_holdings[ticker].market_value if ticker in curr_holdings else 0.0
        sec = securities.get(ticker)
        position_return = (end_mv - start_mv) / start_mv if start_mv else None
        contribution = (end_mv - start_mv) / total_start
        rows.append(
            {
                "ticker": ticker,
                "name": sec.name if sec else ticker,
                "start_value": start_mv,
                "end_value": end_mv,
                "position_return": position_return,
                "contribution_to_return": contribution,
                "status": "new" if start_mv == 0 else ("exited" if end_mv == 0 else "held"),
            }
        )
    rows.sort(key=lambda r: r["contribution_to_return"], reverse=True)
    return rows
