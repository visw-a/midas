"""Populates an empty database with the historical statement data in seed_data.py."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import ActivityEvent, Holding, IncomeRecord, Security, Snapshot
from app.seed_data import ACTIVITY_EVENTS, SECURITIES, SNAPSHOTS


def seed_if_empty(db: Session) -> None:
    if db.query(Snapshot).first() is not None:
        return  # already seeded

    for ticker, meta in SECURITIES.items():
        db.add(Security(ticker=ticker, **meta))
    db.flush()

    for snap in SNAPSHOTS:
        cash = snap["cash"]
        cash_value = round(cash["quantity"] * cash["price"], 2)
        stock_holdings = snap["holdings"]
        stocks_value = round(sum(h["quantity"] * h["price"] for h in stock_holdings), 2)

        snapshot = Snapshot(
            date=snap["date"],
            custodian=snap["custodian"],
            account_label=snap["account_label"],
            cash_value=cash_value,
            stocks_value=stocks_value,
            total_value=round(cash_value + stocks_value, 2),
            source_document=snap["source_document"],
            market_change_override=snap.get("market_change_override"),
        )
        db.add(snapshot)
        db.flush()

        db.add(
            Holding(
                snapshot_id=snapshot.id,
                ticker="CASH",
                quantity=cash["quantity"],
                price=cash["price"],
                market_value=cash_value,
                cost_basis=cash_value,
                unrealized_gain=0.0,
            )
        )
        for h in stock_holdings:
            market_value = round(h["quantity"] * h["price"], 2)
            db.add(
                Holding(
                    snapshot_id=snapshot.id,
                    ticker=h["ticker"],
                    quantity=h["quantity"],
                    price=h["price"],
                    market_value=market_value,
                    cost_basis=h.get("cost_basis"),
                    unrealized_gain=h.get("unrealized_gain"),
                )
            )

        income = snap["income"]
        db.add(
            IncomeRecord(
                month=snap["date"],
                dividends=income["dividends"],
                interest=income["interest"],
                other=income["other"],
            )
        )

    for event in ACTIVITY_EVENTS:
        db.add(ActivityEvent(**event))

    db.commit()
