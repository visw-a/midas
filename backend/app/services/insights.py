"""Extended quantitative metrics and a deterministic takeaways engine -- the
"so what" section of the report.

Every number and recommendation here is computed directly from the
statement data with fixed, documented rules (no LLM call, no judgment call
hidden in a prompt): that's a deliberate choice for an investment process --
a PM should be able to trace every takeaway back to the exact figure that
produced it, the same way they'd trust a risk system's output over a
one-off opinion.
"""

from __future__ import annotations

import datetime as dt
import math

import numpy as np
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import IncomeRecord, Security, Snapshot
from app.services import analytics

settings = get_settings()

# Thresholds the takeaways engine flags against. Centralized here so the
# rules read like policy, not magic numbers buried in conditionals.
CASH_ZSCORE_WATCH = 1.0
LAGGARD_CONTRIB_WATCH = -0.005  # a position dragging >0.5% off NAV in the period
LAGGARD_CONTRIB_ACTION = -0.015  # >1.5% off NAV -- worth a real look
WINNER_TRIM_WEIGHT = 0.10  # a big winner that's also >10% of NAV is a trim candidate
STALE_STATEMENT_WATCH_DAYS = 45
LOW_SHARPE_WATCH = 0.3


def _zscore(values: list[float], current: float) -> tuple[float, float, float]:
    arr = np.array(values)
    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
    z = (current - mean) / std if std > 0 else 0.0
    return mean, std, z


def _benchmark_cumulative_and_annualized(
    raw_returns: list[float | None], total_months: float
) -> tuple[float | None, float | None]:
    if not raw_returns or any(r is None for r in raw_returns):
        return None, None
    total = 1.0
    for r in raw_returns:
        total *= 1 + r  # type: ignore[operator]
    cumulative = total - 1.0
    return cumulative, analytics.annualize_return(cumulative, total_months)


def _extended_metrics(
    db: Session,
    snapshots: list[Snapshot],
    periods: list[analytics.PeriodReturn],
    risk: dict,
    bench: dict,
) -> dict:
    monthly_returns = np.array(analytics.monthly_normalized_returns(periods)) if periods else np.array([])

    # Sortino: like Sharpe, but only penalizes downside variance.
    downside = monthly_returns[monthly_returns < 0] if len(monthly_returns) else np.array([])
    downside_dev = float(np.sqrt(np.mean(downside**2))) * math.sqrt(12) if len(downside) else 0.0
    ann_return = risk.get("annualized_return")
    sortino_ratio = (
        (ann_return - analytics.RISK_FREE_RATE_ANNUAL) / downside_dev
        if (ann_return is not None and downside_dev > 0)
        else None
    )

    tracking_error = None
    information_ratio = None
    alpha = None
    benchmark_cumulative_return = None
    benchmark_annualized_return = None
    if bench["available"] and len(bench["monthly_returns"]) == len(monthly_returns) and len(monthly_returns) > 1:
        diffs = monthly_returns - np.array(bench["monthly_returns"])
        tracking_error = float(np.std(diffs, ddof=1)) * math.sqrt(12)
        total_months = sum(p.months_elapsed for p in periods)
        benchmark_cumulative_return, benchmark_annualized_return = _benchmark_cumulative_and_annualized(
            bench["raw_returns"], total_months
        )
        beta = risk.get("beta")
        if ann_return is not None and benchmark_annualized_return is not None and beta is not None:
            alpha = ann_return - (
                analytics.RISK_FREE_RATE_ANNUAL + beta * (benchmark_annualized_return - analytics.RISK_FREE_RATE_ANNUAL)
            )
        if (
            tracking_error
            and tracking_error > 0
            and ann_return is not None
            and benchmark_annualized_return is not None
        ):
            information_ratio = (ann_return - benchmark_annualized_return) / tracking_error

    # Concentration: Herfindahl-Hirschman Index on the equity sleeve only
    # (cash isn't a stock-picking concentration risk), plus the more
    # intuitive "effective number of positions" = 1 / HHI.
    latest = snapshots[-1]
    holdings = analytics.get_holdings_for_snapshot(db, latest.id)
    securities = {s.ticker: s for s in db.query(Security).all()}
    equity_holdings = [h for h in holdings if h.ticker != "CASH"]
    equity_total = sum(h.market_value for h in equity_holdings) or 1.0
    equity_weights = sorted((h.market_value / equity_total for h in equity_holdings), reverse=True)
    hhi = sum(w**2 for w in equity_weights)
    effective_positions = 1 / hhi if hhi > 0 else None
    top3_concentration = sum(equity_weights[:3])

    # Win rate + best/worst performer, from unrealized gain on positions
    # where cost basis is known.
    priced = [h for h in equity_holdings if h.cost_basis is not None and h.unrealized_gain is not None]
    win_rate = (sum(1 for h in priced if h.unrealized_gain > 0) / len(priced)) if priced else None

    def _perf_row(h) -> dict:
        sec = securities.get(h.ticker)
        pct = h.unrealized_gain / h.cost_basis if h.cost_basis else None
        return {
            "ticker": h.ticker,
            "name": sec.name if sec else h.ticker,
            "unrealized_gain": h.unrealized_gain,
            "unrealized_gain_pct": pct,
        }

    best_performer = _perf_row(max(priced, key=lambda h: h.unrealized_gain)) if priced else None
    worst_performer = _perf_row(min(priced, key=lambda h: h.unrealized_gain)) if priced else None

    # Cumulative dividend income collected across every statement on file,
    # expressed as a % of the current NAV. Explicitly NOT an annualized
    # yield -- the statements span an irregular, gapped window.
    total_dividends = sum(r.dividends for r in db.query(IncomeRecord).all())
    portfolio_income_pct_of_nav = total_dividends / latest.total_value if latest.total_value else None

    # Cash weight vs. its own history across the snapshots on file.
    cash_weights = [s.cash_value / s.total_value for s in snapshots if s.total_value]
    cash_mean, cash_std, cash_z = _zscore(cash_weights, cash_weights[-1]) if cash_weights else (0.0, 0.0, 0.0)

    days_since_statement = (dt.date.today() - latest.date).days

    return {
        "sortino_ratio": sortino_ratio,
        "tracking_error": tracking_error,
        "information_ratio": information_ratio,
        "alpha": alpha,
        "benchmark_cumulative_return": benchmark_cumulative_return,
        "benchmark_annualized_return": benchmark_annualized_return,
        "hhi": hhi,
        "effective_positions": effective_positions,
        "num_equity_positions": len(equity_holdings),
        "top3_concentration": top3_concentration,
        "win_rate": win_rate,
        "best_performer": best_performer,
        "worst_performer": worst_performer,
        "total_dividend_income": total_dividends,
        "portfolio_income_pct_of_nav": portfolio_income_pct_of_nav,
        "cash_weight_current": cash_weights[-1] if cash_weights else None,
        "cash_weight_mean": cash_mean,
        "cash_weight_stdev": cash_std,
        "cash_weight_zscore": cash_z,
        "days_since_statement": days_since_statement,
    }


def _takeaway(id_: str, severity: str, headline: str, detail: str) -> dict:
    return {"id": id_, "severity": severity, "headline": headline, "detail": detail}


def _build_takeaways(
    db: Session,
    snapshots: list[Snapshot],
    periods: list[analytics.PeriodReturn],
    risk: dict,
    metrics: dict,
    benchmark_ticker: str,
) -> list[dict]:
    items: list[dict] = []
    latest = snapshots[-1]

    # 1. Always-on context: sample size caveat, pinned first.
    items.append(
        _takeaway(
            "sample-size",
            "info",
            f"Figures are computed from {len(snapshots)} statements on file",
            f"Covering {snapshots[0].date.strftime('%b %Y')} to {latest.date.strftime('%b %Y')}. "
            "Treat return, risk, and ratio figures as directional -- not statistically robust -- "
            "until more months of history accumulate.",
        )
    )

    # 2. Statement freshness.
    days = metrics["days_since_statement"]
    if days > STALE_STATEMENT_WATCH_DAYS:
        items.append(
            _takeaway(
                "stale-statement",
                "watch",
                f"Latest statement is {days} days old",
                f"As of {latest.date.strftime('%B %d, %Y')} ({latest.custodian}). Confirm no material trades, "
                "transfers, or deposits have occurred since, and refresh this dashboard once the next "
                "statement is available.",
            )
        )

    # 3. Cash deployment vs. its own history.
    cash_pct = metrics["cash_weight_current"]
    cash_z = metrics["cash_weight_zscore"]
    if cash_pct is not None:
        cash_dollar = cash_pct * latest.total_value
        if cash_z > CASH_ZSCORE_WATCH:
            items.append(
                _takeaway(
                    "cash-high",
                    "watch",
                    f"Cash reserve is above its typical level: {cash_pct:.1%} of NAV",
                    f"${cash_dollar:,.0f} in cash & money market, vs. a {metrics['cash_weight_mean']:.1%} historical "
                    f"average across statements on file (+{cash_z:.1f} std. dev.). Consider whether this reflects "
                    "an intentional defensive stance or idle capital worth deploying.",
                )
            )
        elif cash_z < -CASH_ZSCORE_WATCH:
            items.append(
                _takeaway(
                    "cash-low",
                    "watch",
                    f"Cash reserve is below its typical level: {cash_pct:.1%} of NAV",
                    f"${cash_dollar:,.0f} in cash & money market, vs. a {metrics['cash_weight_mean']:.1%} historical "
                    f"average ({cash_z:.1f} std. dev.). Limited dry powder to add to positions or cover redemptions "
                    "without trimming existing holdings.",
                )
            )
        else:
            items.append(
                _takeaway(
                    "cash-normal",
                    "info",
                    f"Cash reserve at {cash_pct:.1%} of NAV is in line with its historical range",
                    f"${cash_dollar:,.0f} against a {metrics['cash_weight_mean']:.1%} average across statements on "
                    "file. No deployment action indicated by cash levels alone.",
                )
            )

    # 4. Concentration: hard limit breaches first, then general context.
    concentration_rows = analytics.concentration(db, latest)
    breaches = [r for r in concentration_rows if r["over_limit"]]
    for r in breaches:
        items.append(
            _takeaway(
                f"concentration-{r['ticker']}",
                "action",
                f"{r['ticker']} exceeds the single-name limit: {r['weight']:.1%} of NAV",
                f"${r['market_value']:,.0f} in {r['name']}, above the {analytics.SINGLE_NAME_LIMIT:.0%} policy limit. "
                "Trimming toward policy would reduce single-stock risk without changing the broader thesis.",
            )
        )
    if not breaches and metrics["effective_positions"] is not None:
        items.append(
            _takeaway(
                "concentration-context",
                "info",
                f"Effective position count is {metrics['effective_positions']:.1f} against "
                f"{metrics['num_equity_positions']} actual equity holdings",
                f"Top 3 positions are {metrics['top3_concentration']:.1%} of the equity sleeve. No single-name limit "
                "breach at the latest statement, but concentration is meaningfully higher than an equal-weighted "
                f"book of {metrics['num_equity_positions']} names would imply (that would score "
                f"{metrics['num_equity_positions']:.1f}).",
            )
        )

    # 5. Sector limit breaches.
    for r in analytics.sector_exposure(db, latest):
        if r["over_limit"]:
            items.append(
                _takeaway(
                    f"sector-{r['sector']}",
                    "action",
                    f"{r['sector']} exceeds the sector limit: {r['weight']:.1%} of NAV",
                    f"${r['market_value']:,.0f} across the sector, above the {analytics.SECTOR_LIMIT:.0%} policy "
                    "limit. Worth checking whether this concentration is a deliberate sector call.",
                )
            )

    # 6. Recent winners / laggards, from the latest attribution period.
    if len(snapshots) >= 2:
        attribution_rows = analytics.attribution(db, snapshots[-2], latest)
        flow_note = (
            " (this period includes the Vanguard-to-Fidelity transfer, so treat contribution figures as "
            "directional)"
            if latest.market_change_override is not None
            else ""
        )
        laggards = sorted(
            (r for r in attribution_rows if r["contribution_to_return"] <= LAGGARD_CONTRIB_WATCH),
            key=lambda r: r["contribution_to_return"],
        )
        for r in laggards[:2]:
            severity = "action" if r["contribution_to_return"] <= LAGGARD_CONTRIB_ACTION else "watch"
            move = f"moved {r['position_return']:+.1%}" if r["position_return"] is not None else "was initiated"
            items.append(
                _takeaway(
                    f"laggard-{r['ticker']}",
                    severity,
                    f"{r['ticker']} cost {abs(r['contribution_to_return']):.1%} of NAV last period",
                    f"{r['name']} {move} over {snapshots[-2].date.strftime('%b %Y')} to "
                    f"{latest.date.strftime('%b %Y')}{flow_note}. Worth a fresh look at the thesis if the move "
                    "reflects a change in fundamentals rather than noise.",
                )
            )

        winners = sorted(
            (r for r in attribution_rows if r["contribution_to_return"] > 0),
            key=lambda r: r["contribution_to_return"],
            reverse=True,
        )
        if winners:
            top = winners[0]
            weight_row = next((c for c in concentration_rows if c["ticker"] == top["ticker"]), None)
            top_move = f"moved {top['position_return']:+.1%}" if top["position_return"] is not None else "was a new addition"
            if weight_row and weight_row["weight"] >= WINNER_TRIM_WEIGHT:
                items.append(
                    _takeaway(
                        f"winner-{top['ticker']}",
                        "watch",
                        f"{top['ticker']} was the top contributor and is now {weight_row['weight']:.1%} of NAV",
                        f"{top['name']} added {top['contribution_to_return']:.1%} to NAV last period{flow_note}. "
                        "A strong run that's grown into a large position is worth weighing against the single-name "
                        "limit -- consider whether a partial trim is warranted to lock in gains and manage "
                        "concentration.",
                    )
                )
            else:
                items.append(
                    _takeaway(
                        f"winner-{top['ticker']}",
                        "info",
                        f"{top['ticker']} was the top contributor last period: +{top['contribution_to_return']:.1%} of NAV",
                        f"{top['name']} {top_move}{flow_note}.",
                    )
                )

    # 7. Benchmark comparison.
    cum_return = analytics.cumulative_return(periods) if periods else None
    if metrics["benchmark_cumulative_return"] is not None and cum_return is not None:
        gap = cum_return - metrics["benchmark_cumulative_return"]
        if gap >= 0:
            items.append(
                _takeaway(
                    "benchmark-ahead",
                    "info",
                    f"Portfolio has outpaced {benchmark_ticker} by {gap:.1%} over the period covered",
                    f"Portfolio cumulative return of {cum_return:+.1%} vs. {metrics['benchmark_cumulative_return']:+.1%} "
                    f"for {benchmark_ticker} across the same statement dates.",
                )
            )
        else:
            behind_detail = (
                f"Portfolio cumulative return of {cum_return:+.1%} vs. {metrics['benchmark_cumulative_return']:+.1%} "
                f"for {benchmark_ticker} across the same statement dates."
            )
            if metrics["alpha"] is not None:
                behind_detail += f" Alpha of {metrics['alpha']:+.1%} annualized."
            items.append(
                _takeaway(
                    "benchmark-behind",
                    "watch",
                    f"Portfolio has trailed {benchmark_ticker} by {abs(gap):.1%} over the period covered",
                    behind_detail,
                )
            )
    else:
        items.append(
            _takeaway(
                "benchmark-unavailable",
                "info",
                f"Benchmark ({benchmark_ticker}) comparison unavailable right now",
                "Live benchmark price data couldn't be fetched in this environment, so alpha, tracking error, and "
                "information ratio can't be computed until it's reachable. Portfolio-only figures above are "
                "unaffected.",
            )
        )

    # 8. Income.
    if metrics["portfolio_income_pct_of_nav"] is not None:
        items.append(
            _takeaway(
                "income",
                "info",
                f"${metrics['total_dividend_income']:,.0f} in dividend income collected across statements on file",
                f"Equivalent to {metrics['portfolio_income_pct_of_nav']:.1%} of current NAV. Not an annualized "
                "yield -- the statements on file span an irregular, gapped window.",
            )
        )

    # 9. Risk-adjusted return read.
    sharpe = risk.get("sharpe_ratio")
    if sharpe is not None:
        if sharpe < LOW_SHARPE_WATCH:
            items.append(
                _takeaway(
                    "sharpe-low",
                    "watch",
                    f"Risk-adjusted return is soft: Sharpe ratio of {sharpe:.2f}",
                    f"Against {risk['annualized_volatility']:.1%} annualized volatility. Return per unit of risk "
                    "taken has been modest over the period on file -- worth watching whether that's temporary "
                    "(a rough stretch for a few names) or structural (the book is carrying more risk than its "
                    "returns justify).",
                )
            )
        else:
            items.append(
                _takeaway(
                    "sharpe-ok",
                    "info",
                    f"Sharpe ratio of {sharpe:.2f} on {risk['annualized_volatility']:.1%} annualized volatility",
                    "Risk-adjusted return over the period on file does not flag a concern on its own.",
                )
            )

    order = {"action": 0, "watch": 1, "info": 2}
    items.sort(key=lambda i: order.get(i["severity"], 3))
    return items


def build_insights(db: Session) -> dict:
    snapshots = analytics.get_snapshots(db)
    periods = analytics.compute_period_returns(snapshots)
    bench = analytics.benchmark_series(db, snapshots, settings.benchmark_ticker)
    risk = analytics.risk_metrics(periods, bench["monthly_returns"] if bench["available"] else None)
    metrics = _extended_metrics(db, snapshots, periods, risk, bench)
    takeaways = _build_takeaways(db, snapshots, periods, risk, metrics, settings.benchmark_ticker)

    return {
        "as_of_statement": snapshots[-1].date.isoformat(),
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "metrics": metrics,
        "takeaways": takeaways,
    }
