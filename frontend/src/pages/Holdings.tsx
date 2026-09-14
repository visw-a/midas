import { useMemo, useState } from "react";
import type { Holding } from "../api/client";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill } from "../components/Card";
import { emphasisClass, formatCurrency, formatNumber, formatPercent } from "../lib/format";
import { useApi } from "../lib/useApi";

type SortKey = "market_value" | "weight" | "unrealized_gain" | "ticker" | "day_change_pct";

export function Holdings() {
  const { data, error, loading } = useApi(portfolioApi.holdings);
  const [sortKey, setSortKey] = useState<SortKey>("market_value");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const rows = useMemo(() => {
    if (!data) return [];
    const holdings = [...data.holdings];
    holdings.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === "string" || typeof bv === "string") {
        return sortDir * String(av).localeCompare(String(bv));
      }
      return sortDir * ((av as number) - (bv as number));
    });
    return holdings;
  }, [data, sortKey, sortDir]);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error || "Failed to load"} />;

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  const anyLive = data.holdings.some((h) => h.is_live_price);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">As of statement {data.as_of_statement}</p>
        <h1 className="mt-1 text-2xl font-bold text-navy-900">Holdings</h1>
        <p className="mt-1 text-sm text-navy-500">
          {anyLive
            ? "Marked to market with the latest live quote where available; statement price used otherwise."
            : "Live quotes unavailable right now — showing statement prices for every position."}
        </p>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-200 text-left text-xs font-bold uppercase tracking-wide text-navy-500">
                <SortableHeader label="Ticker" sortKey="ticker" active={sortKey} dir={sortDir} onClick={toggleSort} />
                <th className="pb-2 pr-4">Sector</th>
                <th className="pb-2 pr-4 text-right">Qty</th>
                <th className="pb-2 pr-4 text-right">Price</th>
                <SortableHeader label="Day" sortKey="day_change_pct" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <SortableHeader label="Weight" sortKey="weight" active={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <SortableHeader
                  label="Market Value"
                  sortKey="market_value"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <th className="pb-2 pr-4 text-right">Cost Basis</th>
                <SortableHeader
                  label="Unrealized G/L"
                  sortKey="unrealized_gain"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <HoldingRow key={h.ticker} h={h} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HoldingRow({ h }: { h: Holding }) {
  return (
    <tr className="border-b border-navy-100 last:border-0 hover:bg-navy-50">
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums font-bold text-navy-900">{h.ticker}</span>
          {h.is_live_price ? <Pill tone="solid">live</Pill> : <Pill>stmt</Pill>}
        </div>
        <div className="text-xs text-navy-500">{h.name}</div>
      </td>
      <td className="py-2.5 pr-4 text-navy-600">{h.sector}</td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-navy-800">{formatNumber(h.quantity, 2)}</td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-navy-800">{formatCurrency(h.current_price)}</td>
      <td className={`py-2.5 pr-4 text-right tabular-nums ${emphasisClass(h.day_change_pct)}`}>
        {h.day_change_pct !== null ? formatPercent(h.day_change_pct, { signed: true }) : "—"}
      </td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-navy-800">{formatPercent(h.weight)}</td>
      <td className="py-2.5 pr-4 text-right tabular-nums font-bold text-navy-900">{formatCurrency(h.market_value)}</td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-navy-500">{formatCurrency(h.cost_basis)}</td>
      <td className={`py-2.5 text-right tabular-nums ${emphasisClass(h.unrealized_gain)}`}>
        {formatCurrency(h.unrealized_gain)}
      </td>
    </tr>
  );
}

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: 1 | -1;
  onClick: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <th
      className={`cursor-pointer select-none pb-2 pr-4 ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onClick(sortKey)}
    >
      <span className={isActive ? "text-navy-900" : ""}>
        {label} {isActive && (dir === 1 ? "↑" : "↓")}
      </span>
    </th>
  );
}
