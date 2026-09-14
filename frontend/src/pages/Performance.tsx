import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill, StatTile } from "../components/Card";
import { formatDate, formatPercent } from "../lib/format";
import { useApi } from "../lib/useApi";

export function Performance() {
  const { data, error, loading } = useApi(portfolioApi.performance);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error || "Failed to load"} />;

  const { risk_metrics: risk } = data;
  const chartData = data.periods.map((p) => ({
    label: formatDate(p.end_date),
    portfolio: p.return_pct * 100,
    flowAdjusted: p.flow_adjusted,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-navy-900">Performance</h1>
        <p className="mt-1 text-sm text-navy-500">
          Period-over-period returns computed from each statement's reported NAV, benchmarked against{" "}
          {data.benchmark_ticker}
          {!data.benchmark_available && " (benchmark data unavailable right now — showing portfolio only)"}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Cumulative Return" value={formatPercent(data.cumulative_return, { signed: true })} />
        <StatTile label="Annualized Return" value={formatPercent(risk.annualized_return, { signed: true })} />
        <StatTile label="Annualized Volatility" value={formatPercent(risk.annualized_volatility)} />
        <StatTile label="Max Drawdown" value={formatPercent(risk.max_drawdown)} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <StatTile
          label="Sharpe Ratio"
          value={risk.sharpe_ratio !== null && risk.sharpe_ratio !== undefined ? risk.sharpe_ratio.toFixed(2) : "—"}
          sub={`vs. ${formatPercent(risk.risk_free_rate)} assumed risk-free rate`}
        />
        <StatTile
          label="Beta"
          value={risk.beta !== null && risk.beta !== undefined ? risk.beta.toFixed(2) : "—"}
          sub={`vs. ${data.benchmark_ticker}`}
        />
      </div>

      <Card title="Period Returns" subtitle="Return between each pair of consecutive statements">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f2" vertical={false} />
              <XAxis dataKey="label" stroke="#57648a" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#57648a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={48} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #ccd2e4", borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: "#161d33", fontWeight: 600 }}
                formatter={(v) => `${Number(v).toFixed(2)}%`}
              />
              <Bar dataKey="portfolio" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.portfolio >= 0 ? "#232d4b" : "#a4aec9"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center gap-4 text-xs text-navy-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-navy-800" /> Positive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-navy-300" /> Negative
          </span>
        </div>
      </Card>

      <Card title="Period Detail" subtitle={risk.note}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-200 text-left text-xs font-bold uppercase tracking-wide text-navy-500">
                <th className="pb-2 pr-4">Period</th>
                <th className="pb-2 pr-4 text-right">Return</th>
                <th className="pb-2 pr-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.periods.map((p) => (
                <tr key={p.end_date} className="border-b border-navy-100 last:border-0">
                  <td className="py-2.5 pr-4 text-navy-800">
                    {formatDate(p.start_date)} → {formatDate(p.end_date)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-navy-900">
                    {formatPercent(p.return_pct, { signed: true })}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-navy-500">
                    {p.flow_adjusted && <Pill>flow-adjusted</Pill>} {p.note}
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
