import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill } from "../components/Card";
import { changeColorClass, formatDate, formatPercent } from "../lib/format";
import { useApi } from "../lib/useApi";

export function Attribution() {
  const [periodEnd, setPeriodEnd] = useState<string | undefined>(undefined);
  const { data, error, loading } = useApi(() => portfolioApi.attribution(periodEnd), [periodEnd]);

  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error || "Failed to load"} />;

  const chartData = data.attribution.map((r) => ({
    ticker: r.ticker,
    contribution: r.contribution_to_return * 100,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">Performance Attribution</h1>
          <p className="mt-1 text-sm text-ink-400">
            Contribution to total portfolio return by position, {formatDate(data.start_date)} → {formatDate(data.end_date)}
            {data.flow_adjusted_period && (
              <span className="ml-2">
                <Pill tone="warn">custodian transfer period</Pill>
              </span>
            )}
          </p>
        </div>
        <label className="text-xs text-ink-400">
          Period ending{" "}
          <select
            value={periodEnd ?? ""}
            onChange={(e) => setPeriodEnd(e.target.value || undefined)}
            className="ml-2 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-xs text-ink-100"
          >
            <option value="">Most recent</option>
            {data.available_periods.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <Card title="Contribution to Return" subtitle="Each holding's dollar change as a % of starting NAV">
        <div style={{ height: Math.max(chartData.length * 32, 200) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={56}
                interval={0}
              />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => `${Number(v).toFixed(2)}%`}
              />
              <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.contribution >= 0 ? "#1f9d6b" : "#d64545"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Attribution Detail">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4 text-right">Position Return</th>
                <th className="pb-2 pr-4 text-right">Contribution</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.attribution.map((r) => (
                <tr key={r.ticker} className="border-b border-ink-800/60 last:border-0">
                  <td className="py-2.5 pr-4 font-mono-nums font-medium text-ink-100">{r.ticker}</td>
                  <td className="py-2.5 pr-4 text-ink-300">{r.name}</td>
                  <td className={`py-2.5 pr-4 text-right font-mono-nums ${changeColorClass(r.position_return)}`}>
                    {formatPercent(r.position_return, { signed: true })}
                  </td>
                  <td className={`py-2.5 pr-4 text-right font-mono-nums ${changeColorClass(r.contribution_to_return)}`}>
                    {formatPercent(r.contribution_to_return, { signed: true })}
                  </td>
                  <td className="py-2.5 text-right">
                    {r.status === "new" && <Pill tone="good">New</Pill>}
                    {r.status === "exited" && <Pill tone="warn">Exited</Pill>}
                    {r.status === "held" && <Pill tone="neutral">Held</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.flow_adjusted_period && (
          <p className="mt-4 text-xs text-ink-500">
            Note: this period includes the Vanguard → Fidelity custodian transfer. Per-position contribution here
            reflects raw market-value change and does not net out the in-kind transfer mechanics the way the
            portfolio-level return on the Performance page does — treat individual contributions as directional for
            this period.
          </p>
        )}
      </Card>
    </div>
  );
}
