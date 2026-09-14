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
        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">As of statement {data.as_of_statement}</p>
        <h1 className="mt-1 text-2xl font-bold text-navy-900">Risk & Concentration</h1>
        <p className="mt-1 text-sm text-navy-500">
          Policy guardrails: no single position over {formatPercent(data.single_name_limit)} of NAV, no sector over{" "}
          {formatPercent(data.sector_limit)} of NAV.
        </p>
      </header>

      <Card title="Sector Exposure" subtitle="Market value by GICS sector, latest statement">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorChartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9f2" horizontal={false} />
              <XAxis
                type="number"
                stroke="#57648a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="sector"
                stroke="#414d70"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={160}
                interval={0}
              />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #ccd2e4", borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: "#161d33", fontWeight: 600 }}
                formatter={(v, _n, item) => [`${Number(v).toFixed(1)}% (${formatCurrency((item.payload as { market_value: number }).market_value)})`, "Weight"]}
              />
              <Bar dataKey="pct" radius={[0, 3, 3, 0]}>
                {sectorChartData.map((s, i) => (
                  <Cell key={i} fill={s.over_limit ? "#232d4b" : "#7885a8"} />
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
              <tr className="border-b border-navy-200 text-left text-xs font-bold uppercase tracking-wide text-navy-500">
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4 text-right">Market Value</th>
                <th className="pb-2 pr-4 text-right">Weight</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.concentration.map((c) => (
                <tr key={c.ticker} className="border-b border-navy-100 last:border-0">
                  <td className="py-2.5 pr-4 tabular-nums font-bold text-navy-900">{c.ticker}</td>
                  <td className="py-2.5 pr-4 text-navy-600">{c.name}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-navy-800">{formatCurrency(c.market_value)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-navy-800">{formatPercent(c.weight)}</td>
                  <td className="py-2.5 text-right">
                    {c.over_limit ? <Pill tone="solid">Over limit</Pill> : <Pill>OK</Pill>}
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
