import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Pie, PieChart } from "recharts";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill, StatTile } from "../components/Card";
import { emphasisClass, formatCurrency, formatDateShort, formatPercent } from "../lib/format";
import { useApi } from "../lib/useApi";

const ALLOCATION_COLORS = ["#232d4b", "#a4aec9"]; // navy-800, navy-300

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
        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">
          {summary.account_label} · Statement as of {summary.as_of_statement}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-navy-900">Portfolio Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Net Asset Value"
          value={formatCurrency(summary.live_total_value)}
          sub={
            summary.change_since_statement !== 0
              ? `${formatCurrency(summary.change_since_statement, { signed: true })} (${formatPercent(
                  summary.change_since_statement_pct,
                  { signed: true }
                )}) since statement`
              : "Live pricing unavailable — showing latest statement value"
          }
        />
        <StatTile label="Last Period Return" value={formatPercent(summary.last_period_return, { signed: true })} sub={summary.last_period_note ?? undefined} />
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
                  <XAxis dataKey="date" stroke="#57648a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#57648a"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) => formatCurrency(v, { compact: true })}
                    domain={["dataMin - 20000", "dataMax + 20000"]}
                  />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid #ccd2e4", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#161d33", fontWeight: 600 }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Line type="monotone" dataKey="value" stroke="#232d4b" strokeWidth={2} dot={{ r: 3, fill: "#232d4b" }} />
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
                    <Cell key={i} fill={ALLOCATION_COLORS[i]} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #ccd2e4", borderRadius: 6, fontSize: 12 }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {allocation.map((a, i) => (
              <div key={a.name} className="flex items-center gap-1.5 text-navy-600">
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
          <Link to="/holdings" className="text-xs font-bold text-navy-800 hover:underline">
            View all →
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-200 text-left text-xs font-bold uppercase tracking-wide text-navy-500">
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4 text-right">Weight</th>
                <th className="pb-2 pr-4 text-right">Market Value</th>
                <th className="pb-2 text-right">Unrealized G/L</th>
              </tr>
            </thead>
            <tbody>
              {topHoldings.map((h) => (
                <tr key={h.ticker} className="border-b border-navy-100 last:border-0">
                  <td className="py-2.5 pr-4 font-bold text-navy-900">
                    <span className="flex items-center gap-1.5">
                      {h.ticker}
                      {!h.is_live_price && <Pill>stmt</Pill>}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-navy-600">{h.name}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-navy-800">{formatPercent(h.weight)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-navy-800">{formatCurrency(h.market_value)}</td>
                  <td className={`py-2.5 text-right tabular-nums ${emphasisClass(h.unrealized_gain)}`}>
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
