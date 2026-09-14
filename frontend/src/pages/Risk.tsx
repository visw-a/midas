import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { portfolioApi } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill } from "../components/Card";
import { formatCurrency, formatPercent } from "../lib/format";
import { useApi } from "../lib/useApi";

export function Risk() {
  const { data, error, loading } = useApi(portfolioApi.risk);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error || "Failed to load"} />;

  const sectorChartData = data.sector_exposure.map((s) => ({ ...s, pct: s.weight * 100 }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">As of statement {data.as_of_statement}</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-100">Risk & Concentration</h1>
        <p className="mt-1 text-sm text-ink-400">
          Policy guardrails: no single position over {formatPercent(data.single_name_limit)} of NAV, no sector over{" "}
          {formatPercent(data.sector_limit)} of NAV.
        </p>
      </header>

      <Card title="Sector Exposure" subtitle="Market value by GICS sector, latest statement">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorChartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="sector"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={160}
                interval={0}
              />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v, _n, item) => [`${Number(v).toFixed(1)}% (${formatCurrency((item.payload as { market_value: number }).market_value)})`, "Weight"]}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {sectorChartData.map((s, i) => (
                  <Cell key={i} fill={s.over_limit ? "#d64545" : "#3b82f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Position Concentration" subtitle="Every holding's weight vs. the single-name limit">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4 text-right">Market Value</th>
                <th className="pb-2 pr-4 text-right">Weight</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.concentration.map((c) => (
                <tr key={c.ticker} className="border-b border-ink-800/60 last:border-0">
                  <td className="py-2.5 pr-4 font-mono-nums font-medium text-ink-100">{c.ticker}</td>
                  <td className="py-2.5 pr-4 text-ink-300">{c.name}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-nums text-ink-200">{formatCurrency(c.market_value)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-nums text-ink-200">{formatPercent(c.weight)}</td>
                  <td className="py-2.5 text-right">
                    {c.over_limit ? <Pill tone="warn">Over limit</Pill> : <Pill tone="good">OK</Pill>}
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
