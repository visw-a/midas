import { portfolioApi, type ActivityRow } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Tag } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { formatCurrency, formatDate } from "../lib/format";
import { useApi } from "../lib/useApi";

const CATEGORY_LABEL: Record<string, string> = {
  dividend: "Income",
  trade: "Trade",
  custodian_change: "Custodian Change",
};

export function Activity() {
  const { data, error, loading } = useApi(portfolioApi.activity);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error || "Failed to load"} />;

  const totalIncome = data.activity
    .filter((a) => a.category === "dividend")
    .reduce((sum, a) => sum + (a.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="Dividend income, trades, and account events pulled from each brokerage statement." />

      <Card title="Total Dividend Income" subtitle="Across all statements on file">
        <p className="tabular-nums text-3xl font-bold text-navy-900">{formatCurrency(totalIncome)}</p>
      </Card>

      <Card title="Activity Feed">
        <ol className="divide-y divide-navy-100">
          {[...data.activity].reverse().map((a, i) => (
            <ActivityItem key={i} item={a} />
          ))}
        </ol>
      </Card>
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityRow }) {
  const isMajorEvent = item.category === "custodian_change";
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={isMajorEvent ? "solid" : "outline"}>{CATEGORY_LABEL[item.category] ?? item.category}</Tag>
        <span className="text-xs text-navy-500">{formatDate(item.date)}</span>
        {item.amount !== null && (
          <span className="ml-auto tabular-nums text-sm font-semibold text-navy-900">{formatCurrency(item.amount)}</span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-navy-700">{item.description}</p>
    </li>
  );
}
