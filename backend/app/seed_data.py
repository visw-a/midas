"""
Historical portfolio data transcribed from MII's actual brokerage statements
(Vanguard Jan/Mar/Apr/May 2026, Fidelity Jul 2026 after the account transferred
custodians). This is the ground truth the database is seeded from on first run.

Numbers are taken directly off each statement's "Holdings" section. Where a
statement didn't report cost basis (Jan/Mar/Apr, pre cost-basis-reporting
Vanguard format), cost_basis/unrealized_gain are left as None.
"""

from __future__ import annotations

import datetime as dt

SECURITIES: dict[str, dict[str, str]] = {
    "CASH": {"name": "Cash & Money Market Sweep", "sector": "Cash & Equivalents", "asset_class": "Cash"},
    "GOOG": {"name": "Alphabet Inc Class C", "sector": "Communication Services", "asset_class": "Equity"},
    "GOOGL": {"name": "Alphabet Inc Class A", "sector": "Communication Services", "asset_class": "Equity"},
    "AR": {"name": "Antero Resources Corp", "sector": "Energy", "asset_class": "Equity"},
    "AAPL": {"name": "Apple Inc", "sector": "Information Technology", "asset_class": "Equity"},
    "AXON": {"name": "Axon Enterprise Inc", "sector": "Industrials", "asset_class": "Equity"},
    "OBDC": {"name": "Blue Owl Capital Corp", "sector": "Financials", "asset_class": "Equity"},
    "CAT": {"name": "Caterpillar Inc", "sector": "Industrials", "asset_class": "Equity"},
    "CORZ": {"name": "Core Scientific Inc", "sector": "Information Technology", "asset_class": "Equity"},
    "DAL": {"name": "Delta Air Lines Inc", "sector": "Industrials", "asset_class": "Equity"},
    "ENSG": {"name": "Ensign Group Inc", "sector": "Health Care", "asset_class": "Equity"},
    "MELI": {"name": "MercadoLibre Inc", "sector": "Consumer Discretionary", "asset_class": "Equity"},
    "MP": {"name": "MP Materials Corp", "sector": "Materials", "asset_class": "Equity"},
    "OTIS": {"name": "Otis Worldwide Corp", "sector": "Industrials", "asset_class": "Equity"},
    "PLNT": {"name": "Planet Fitness Inc", "sector": "Consumer Discretionary", "asset_class": "Equity"},
    "CRM": {"name": "Salesforce Inc", "sector": "Information Technology", "asset_class": "Equity"},
    "TDY": {"name": "Teledyne Technologies Inc", "sector": "Information Technology", "asset_class": "Equity"},
    "TSM": {"name": "Taiwan Semiconductor Mfg Co ADR", "sector": "Information Technology", "asset_class": "Equity"},
}

# Each snapshot: statement date, custodian/account, and full holdings list.
# cash is stored separately as a synthetic "CASH" ticker for uniform treatment.
SNAPSHOTS: list[dict] = [
    {
        "date": dt.date(2026, 1, 31),
        "custodian": "Vanguard",
        "account_label": "Vanguard Brokerage XXXX0959",
        "source_document": "MII_Vanguard_Statement_2026_Jan.pdf",
        "cash": {"quantity": 150709.79, "price": 1.00},
        "holdings": [
            {"ticker": "GOOG", "quantity": 73.301, "price": 338.53},
            {"ticker": "GOOGL", "quantity": 204.429, "price": 338.00},
            {"ticker": "AR", "quantity": 728.000, "price": 36.37},
            {"ticker": "AAPL", "quantity": 359.424, "price": 259.48},
            {"ticker": "AXON", "quantity": 122.000, "price": 483.58},
            {"ticker": "OBDC", "quantity": 2031.062, "price": 12.00},
            {"ticker": "CAT", "quantity": 57.499, "price": 657.36},
            {"ticker": "CORZ", "quantity": 1330.000, "price": 17.99},
            {"ticker": "DAL", "quantity": 547.092, "price": 65.89},
            {"ticker": "ENSG", "quantity": 305.186, "price": 171.66},
            {"ticker": "MELI", "quantity": 16.000, "price": 2147.79},
            {"ticker": "OTIS", "quantity": 220.694, "price": 85.42},
            {"ticker": "PLNT", "quantity": 239.000, "price": 91.04},
            {"ticker": "CRM", "quantity": 144.273, "price": 212.29},
            {"ticker": "TDY", "quantity": 81.000, "price": 620.30},
        ],
        "income": {"dividends": 1274.60, "interest": 0.0, "other": 0.0},
    },
    {
        "date": dt.date(2026, 3, 31),
        "custodian": "Vanguard",
        "account_label": "Vanguard Brokerage XXXX0959",
        "source_document": "MII_-_March_2026.pdf",
        "cash": {"quantity": 151585.00, "price": 1.00},
        "holdings": [
            {"ticker": "GOOG", "quantity": 73.352, "price": 286.86},
            {"ticker": "GOOGL", "quantity": 204.570, "price": 287.56},
            {"ticker": "AR", "quantity": 728.000, "price": 42.44},
            {"ticker": "AAPL", "quantity": 359.763, "price": 253.79},
            {"ticker": "AXON", "quantity": 122.000, "price": 424.69},
            {"ticker": "OBDC", "quantity": 2031.062, "price": 11.06},
            {"ticker": "CAT", "quantity": 57.614, "price": 708.46},
            {"ticker": "CORZ", "quantity": 1330.000, "price": 14.96},
            {"ticker": "DAL", "quantity": 548.716, "price": 66.48},
            {"ticker": "ENSG", "quantity": 305.186, "price": 201.50},
            {"ticker": "MELI", "quantity": 16.000, "price": 1729.02},
            {"ticker": "OTIS", "quantity": 221.808, "price": 77.08},
            {"ticker": "PLNT", "quantity": 239.000, "price": 74.38},
            {"ticker": "CRM", "quantity": 144.273, "price": 186.67},
            {"ticker": "TDY", "quantity": 81.000, "price": 605.01},
        ],
        "income": {"dividends": 713.18, "interest": 0.0, "other": 0.0},
    },
    {
        "date": dt.date(2026, 4, 30),
        "custodian": "Vanguard",
        "account_label": "Vanguard Brokerage XXXX0959",
        "source_document": "MII_-_April_2026.pdf",
        "cash": {"quantity": 152030.16, "price": 1.00},
        "holdings": [
            {"ticker": "GOOG", "quantity": 73.352, "price": 381.94},
            {"ticker": "GOOGL", "quantity": 204.570, "price": 384.80},
            {"ticker": "AR", "quantity": 728.000, "price": 39.26},
            {"ticker": "AAPL", "quantity": 359.763, "price": 271.35},
            {"ticker": "AXON", "quantity": 122.000, "price": 401.76},
            {"ticker": "OBDC", "quantity": 2097.048, "price": 11.72},
            {"ticker": "CAT", "quantity": 57.614, "price": 890.11},
            {"ticker": "CORZ", "quantity": 1330.000, "price": 20.00},
            {"ticker": "DAL", "quantity": 548.716, "price": 67.99},
            {"ticker": "ENSG", "quantity": 305.293, "price": 186.69},
            {"ticker": "MELI", "quantity": 16.000, "price": 1792.63},
            {"ticker": "OTIS", "quantity": 221.808, "price": 77.88},
            {"ticker": "PLNT", "quantity": 239.000, "price": 66.67},
            {"ticker": "CRM", "quantity": 144.631, "price": 176.53},
            {"ticker": "TDY", "quantity": 81.000, "price": 645.85},
        ],
        "income": {"dividends": 1279.97, "interest": 0.0, "other": 0.0},
    },
    {
        "date": dt.date(2026, 5, 31),
        "custodian": "Vanguard",
        "account_label": "Vanguard Brokerage XXXX0959",
        "source_document": "MII_-_May_2026.pdf",
        "cash": {"quantity": 152811.42, "price": 1.00},
        "holdings": [
            {"ticker": "GOOGL", "quantity": 204.570, "price": 380.34, "cost_basis": 15023.49, "unrealized_gain": 62782.66},
            {"ticker": "AR", "quantity": 728.000, "price": 35.75, "cost_basis": 25369.42, "unrealized_gain": 656.58},
            {"ticker": "AAPL", "quantity": 360.087, "price": 312.06, "cost_basis": 49924.19, "unrealized_gain": 62444.55},
            {"ticker": "AXON", "quantity": 122.000, "price": 448.72, "cost_basis": 38082.87, "unrealized_gain": 16660.97},
            {"ticker": "OBDC", "quantity": 2097.048, "price": 11.26, "cost_basis": 30866.21, "unrealized_gain": -7253.45},
            {"ticker": "CAT", "quantity": 57.715, "price": 875.87, "cost_basis": 17643.61, "unrealized_gain": 32907.22},
            {"ticker": "DAL", "quantity": 548.716, "price": 82.48, "cost_basis": 18166.22, "unrealized_gain": 27091.87},
            {"ticker": "ENSG", "quantity": 305.293, "price": 167.65, "cost_basis": 31918.73, "unrealized_gain": 19263.64},
            {"ticker": "MELI", "quantity": 16.000, "price": 1695.65, "cost_basis": 29133.36, "unrealized_gain": -2002.96},
            {"ticker": "MP", "quantity": 507.000, "price": 64.70, "cost_basis": 32757.27, "unrealized_gain": 45.63},
            {"ticker": "OTIS", "quantity": 221.808, "price": 70.84, "cost_basis": 21456.64, "unrealized_gain": -5743.77},
            {"ticker": "PLNT", "quantity": 239.000, "price": 53.51, "cost_basis": 24027.96, "unrealized_gain": -11239.07},
            {"ticker": "CRM", "quantity": 144.631, "price": 191.10, "cost_basis": 32519.58, "unrealized_gain": -4880.60},
            {"ticker": "TSM", "quantity": 68.000, "price": 418.45, "cost_basis": 27792.28, "unrealized_gain": 662.32},
            {"ticker": "TDY", "quantity": 81.000, "price": 619.83, "cost_basis": 27892.75, "unrealized_gain": 22313.48},
        ],
        "income": {"dividends": 642.82, "interest": 0.0, "other": 0.0},
    },
    {
        "date": dt.date(2026, 7, 31),
        "custodian": "Fidelity",
        "account_label": "Fidelity Z35-894087",
        "source_document": "MII_-_July_2026_-_Account_Z35894087.pdf",
        # The account was ACAT-transferred from Vanguard to this new Fidelity
        # account on 7/28. The statement itself reports the true market P&L
        # for the period separately from the transfer-in ("Change in
        # Investment Value: -$10,469.63"), which is what should be used for
        # performance/attribution instead of the naive end-start delta (that
        # delta is dominated by the ~$799k transfer, not market movement).
        "market_change_override": -10469.63,
        "cash": {"quantity": 155072.53, "price": 1.00},
        "holdings": [
            {"ticker": "GOOGL", "quantity": 204.000, "price": 356.13, "cost_basis": 14866.33, "unrealized_gain": 57784.19},
            {"ticker": "AR", "quantity": 728.000, "price": 36.14, "cost_basis": 25369.42, "unrealized_gain": 940.50},
            {"ticker": "AAPL", "quantity": 360.000, "price": 308.91, "cost_basis": 49898.11, "unrealized_gain": 61309.49},
            {"ticker": "AXON", "quantity": 122.000, "price": 527.76, "cost_basis": 38082.87, "unrealized_gain": 26303.85},
            {"ticker": "CAT", "quantity": 57.000, "price": 814.81, "cost_basis": 17239.75, "unrealized_gain": 29204.42},
            {"ticker": "DAL", "quantity": 550.000, "price": 87.44, "cost_basis": 18268.78, "unrealized_gain": 29823.22},
            {"ticker": "ENSG", "quantity": 305.000, "price": 178.16, "cost_basis": 31866.46, "unrealized_gain": 22472.34},
            {"ticker": "MP", "quantity": 507.000, "price": 41.37, "cost_basis": 32757.27, "unrealized_gain": -11782.68},
            {"ticker": "MELI", "quantity": 16.000, "price": 1877.95, "cost_basis": 29133.36, "unrealized_gain": 913.84},
            {"ticker": "OTIS", "quantity": 223.000, "price": 71.95, "cost_basis": 21541.25, "unrealized_gain": -5496.40},
            {"ticker": "OBDC", "quantity": 2097.000, "price": 10.75, "cost_basis": 30865.66, "unrealized_gain": -8322.91},
            {"ticker": "PLNT", "quantity": 239.000, "price": 55.91, "cost_basis": 24027.96, "unrealized_gain": -10665.47},
            {"ticker": "CRM", "quantity": 144.000, "price": 184.02, "cost_basis": 32385.24, "unrealized_gain": -5886.36},
            {"ticker": "TSM", "quantity": 68.000, "price": 404.25, "cost_basis": 27792.28, "unrealized_gain": -303.28},
            {"ticker": "TDY", "quantity": 81.000, "price": 655.57, "cost_basis": 27892.75, "unrealized_gain": 25208.42},
        ],
        "income": {"dividends": 42.44, "interest": 0.0, "other": 0.0},
    },
]

# Notable, statement-confirmed events for the activity feed. Exact intra-month
# trade dates for the Mar->Apr->May position changes weren't in the pages
# pulled from the statements, so those are recorded as of the month-end they
# were first observed rather than a precise trade date.
ACTIVITY_EVENTS: list[dict] = [
    {
        "date": dt.date(2026, 5, 31),
        "category": "trade",
        "description": "Exited Core Scientific Inc (CORZ) and Alphabet Inc Class C (GOOG) positions; "
        "initiated new positions in MP Materials Corp (MP) and Taiwan Semiconductor Mfg (TSM).",
        "amount": None,
    },
    {
        "date": dt.date(2026, 7, 28),
        "category": "custodian_change",
        "description": "Account transferred in-kind (ACAT) from Vanguard Brokerage (XXXX0959) to Fidelity "
        "(Z35-894087). $155,030.09 cash exchanged in plus $644,002.73 of transferred securities.",
        "amount": 799032.82,
    },
]
