import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Pie, PieChart } from "recharts";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill, StatTile } from "../components/Card";
import { changeColorClass, formatCurrency, formatDateShort, formatPercent } from "../lib/format";
import { useApi } from "../lib/useApi";

const ALLOCATION_COLORS = ["#3b82f6", "#64748b"];

export function Dashboard() {
  const { data: summary, error: summaryError, loading: summaryLoading } = useApi(portfolioApi.summary);
  const { data: history } = useApi(portfolioApi.history);
  const { data: holdingsData } = useApi(portfolioApi.holdings);

  if (summaryLoading) return <LoadingBlock />;
  if (summaryError || !summary) return <ErrorBlock message={summaryError || "Failed to load"} />;

  const allocation = [
    { name: "Stocks", value: summary.stocks_value },
    { name: "Cash & Equivalents", value: summary.cash_value },
  ];

  const navSeries = history?.snapshots.map((s) => ({ date: formatDateShort(s.date), value: s.total_value })) ?? [];
  const topHoldings = (holdingsData?.holdings ?? []).filter((h) => h.ticker !== "CASH").slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
          {summary.account_label} · Statement as of {summary.as_of_statement}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-100">Portfolio Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Net Asset Value"
          value={formatCurrency(summary.live_total_value)}
          sub={
            summary.change_since_statement !== 0
              ? `${formatCurrency(summary.change_since_statement)} (${formatPercent(summary.change_since_statement_pct, {
                  signed: true,
                })}) since statement`
              : "Live pricing unavailable — showing latest statement value"
          }
          subClassName={changeColorClass(summary.change_since_statement)}
        />
        <StatTile
          label="Last Period Return"
          value={formatPercent(summary.last_period_return, { signed: true })}
          sub={summary.last_period_note ?? undefined}
          subClassName={changeColorClass(summary.last_period_return)}
        />
        <StatTile label="Positions" value={summary.num_positions} sub={`Custodian: ${summary.custodian}`} />
        <StatTile
          label="Cash Weight"
          value={formatPercent(summary.cash_weight)}
          sub={`${formatCurrency(summary.cash_value, { compact: true })} in reserves`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="NAV History" subtitle="Total portfolio value at each statement date" className="lg:col-span-2">
          {navSeries.length > 1 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={navSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) => formatCurrency(v, { compact: true })}
                    domain={["dataMin - 20000", "dataMax + 20000"]}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <LoadingBlock />
          )}
        </Card>

        <Card title="Allocation" subtitle="Stocks vs. cash reserves">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {allocation.map((_, i) => (
                    <Cell key={i} fill={ALLOCATION_COLORS[i]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {allocation.map((a, i) => (
              <div key={a.name} className="flex items-center gap-1.5 text-ink-300">
                <span className="h-2 w-2 rounded-full" style={{ background: ALLOCATION_COLORS[i] }} />
                {a.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Top Holdings"
        subtitle="Largest positions by market value"
        action={
          <Link to="/holdings" className="text-xs font-medium text-accent hover:underline">
            View all →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4 text-right">Weight</th>
                <th className="pb-2 pr-4 text-right">Market Value</th>
                <th className="pb-2 text-right">Unrealized G/L</th>
              </tr>
            </thead>
            <tbody>
              {topHoldings.map((h) => (
                <tr key={h.ticker} className="border-b border-ink-800/60 last:border-0">
                  <td className="py-2.5 pr-4 font-mono-nums font-medium text-ink-100">
                    <span className="flex items-center gap-1.5">
                      {h.ticker}
                      {!h.is_live_price && <Pill tone="neutral">stmt</Pill>}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-ink-300">{h.name}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-nums text-ink-200">{formatPercent(h.weight)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-nums text-ink-200">{formatCurrency(h.market_value)}</td>
                  <td className={`py-2.5 text-right font-mono-nums ${changeColorClass(h.unrealized_gain)}`}>
                    {formatCurrency(h.unrealized_gain)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
