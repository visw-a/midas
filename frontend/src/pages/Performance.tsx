import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, StatTile, Tag } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { formatDate, formatPercent } from "../lib/format";
import { useApi } from "../lib/useApi";

function ratio(value: number | null | undefined): string {
  return value !== null && value !== undefined ? value.toFixed(2) : "—";
}

export function Performance() {
  const { data, error, loading } = useApi(portfolioApi.performance);
  const { data: insights } = useApi(portfolioApi.insights);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error || "Failed to load"} />;

  const { risk_metrics: risk } = data;
  const m = insights?.metrics;
  const chartData = data.periods.map((p) => ({
    label: formatDate(p.end_date),
    portfolio: p.return_pct * 100,
    flowAdjusted: p.flow_adjusted,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Return, risk, and risk-adjusted return"
        title="Performance"
        description={`Period-over-period returns computed from each statement's reported NAV, benchmarked against ${data.benchmark_ticker}${
          !data.benchmark_available ? " (benchmark data unavailable right now — showing portfolio only)" : ""
        }.`}
      />

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-500">Return</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Cumulative Return" value={formatPercent(data.cumulative_return, { signed: true })} />
          <StatTile label="Annualized Return" value={formatPercent(risk.annualized_return, { signed: true })} />
          <StatTile
            label={`${data.benchmark_ticker} Annualized`}
            value={m ? formatPercent(m.benchmark_annualized_return, { signed: true }) : "—"}
          />
          <StatTile label="Alpha (annualized)" value={m ? formatPercent(m.alpha, { signed: true }) : "—"} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-500">Risk</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Annualized Volatility" value={formatPercent(risk.annualized_volatility)} />
          <StatTile label="Max Drawdown" value={formatPercent(risk.max_drawdown)} />
          <StatTile label="Tracking Error" value={m ? formatPercent(m.tracking_error) : "—"} sub={`vs. ${data.benchmark_ticker}`} />
          <StatTile
            label="Beta"
            value={ratio(risk.beta)}
            sub={`vs. ${data.benchmark_ticker}`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-500">Risk-Adjusted Return</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Sharpe Ratio" value={ratio(risk.sharpe_ratio)} sub={`vs. ${formatPercent(risk.risk_free_rate)} risk-free rate`} />
          <StatTile label="Sortino Ratio" value={m ? ratio(m.sortino_ratio) : "—"} sub="Downside deviation only" />
          <StatTile label="Information Ratio" value={m ? ratio(m.information_ratio) : "—"} sub={`vs. ${data.benchmark_ticker}`} />
          <StatTile label="Win Rate" value={m && m.win_rate !== null ? formatPercent(m.win_rate) : "—"} sub="Positions with unrealized gain" />
        </div>
      </section>

      <Card title="Period Returns" subtitle="Return between each pair of consecutive statements">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f2" vertical={false} />
              <XAxis dataKey="label" stroke="#57648a" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#57648a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={48} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #ccd2e4", borderRadius: 0, fontSize: 12 }}
                labelStyle={{ color: "#161d33", fontWeight: 600 }}
                formatter={(v) => `${Number(v).toFixed(2)}%`}
              />
              <Bar dataKey="portfolio" isAnimationActive={false}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.portfolio >= 0 ? "#232d4b" : "#a4aec9"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-center gap-4 text-xs text-navy-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-navy-800" /> Positive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-navy-300" /> Negative
          </span>
        </div>
      </Card>

      <Card title="Period Detail" subtitle={risk.note}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-200 text-left text-[11px] font-bold uppercase tracking-wide text-navy-500">
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
                    {p.flow_adjusted && <Tag>Flow-adjusted</Tag>} {p.note}
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
