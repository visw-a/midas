import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill } from "../components/Card";
import { emphasisClass, formatDate, formatPercent } from "../lib/format";
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
          <h1 className="text-2xl font-bold text-navy-900">Performance Attribution</h1>
          <p className="mt-1 text-sm text-navy-500">
            Contribution to total portfolio return by position, {formatDate(data.start_date)} → {formatDate(data.end_date)}
            {data.flow_adjusted_period && (
              <span className="ml-2">
                <Pill tone="solid">custodian transfer period</Pill>
              </span>
            )}
          </p>
        </div>
        <label className="text-xs text-navy-500">
          Period ending{" "}
          <select
            value={periodEnd ?? ""}
            onChange={(e) => setPeriodEnd(e.target.value || undefined)}
            className="ml-2 rounded border border-navy-300 bg-white px-2 py-1.5 text-xs text-navy-900"
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f2" horizontal={false} />
              <XAxis
                type="number"
                stroke="#57648a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                stroke="#414d70"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={56}
                interval={0}
              />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #ccd2e4", borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: "#161d33", fontWeight: 600 }}
                formatter={(v) => `${Number(v).toFixed(2)}%`}
              />
              <Bar dataKey="contribution" radius={[0, 3, 3, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.contribution >= 0 ? "#232d4b" : "#a4aec9"} />
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
              <tr className="border-b border-navy-200 text-left text-xs font-bold uppercase tracking-wide text-navy-500">
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4 text-right">Position Return</th>
                <th className="pb-2 pr-4 text-right">Contribution</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.attribution.map((r) => (
                <tr key={r.ticker} className="border-b border-navy-100 last:border-0">
                  <td className="py-2.5 pr-4 tabular-nums font-bold text-navy-900">{r.ticker}</td>
                  <td className="py-2.5 pr-4 text-navy-600">{r.name}</td>
                  <td className={`py-2.5 pr-4 text-right tabular-nums ${emphasisClass(r.position_return)}`}>
                    {formatPercent(r.position_return, { signed: true })}
                  </td>
                  <td className={`py-2.5 pr-4 text-right tabular-nums ${emphasisClass(r.contribution_to_return)}`}>
                    {formatPercent(r.contribution_to_return, { signed: true })}
                  </td>
                  <td className="py-2.5 text-right">
                    {r.status === "new" && <Pill tone="solid">New</Pill>}
                    {r.status === "exited" && <Pill tone="solid">Exited</Pill>}
                    {r.status === "held" && <Pill>Held</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.flow_adjusted_period && (
          <p className="mt-4 text-xs text-navy-500">
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
