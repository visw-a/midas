import { portfolioApi, type ActivityRow } from "../api/client";
import { Card, ErrorBlock, LoadingBlock, Pill } from "../components/Card";
import { formatCurrency, formatDate } from "../lib/format";
import { useApi } from "../lib/useApi";

const CATEGORY_TONE: Record<string, "neutral" | "warn" | "good"> = {
  dividend: "good",
  trade: "neutral",
  custodian_change: "warn",
};

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
      <header>
        <h1 className="text-2xl font-semibold text-ink-100">Activity</h1>
        <p className="mt-1 text-sm text-ink-400">
          Dividend income, trades, and account events pulled from each brokerage statement.
        </p>
      </header>

      <Card title="Total Dividend Income" subtitle="Across all statements on file">
        <p className="font-mono-nums text-3xl font-semibold text-gain">{formatCurrency(totalIncome)}</p>
      </Card>

      <Card title="Activity Feed">
        <ol className="relative space-y-6 border-l border-ink-800 pl-6">
          {[...data.activity].reverse().map((a, i) => (
            <ActivityItem key={i} item={a} />
          ))}
        </ol>
      </Card>
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityRow }) {
  return (
    <li className="relative">
      <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-ink-950 bg-accent" />
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={CATEGORY_TONE[item.category] ?? "neutral"}>{CATEGORY_LABEL[item.category] ?? item.category}</Pill>
        <span className="text-xs text-ink-500">{formatDate(item.date)}</span>
        {item.amount !== null && (
          <span className="ml-auto font-mono-nums text-sm font-medium text-ink-200">{formatCurrency(item.amount)}</span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-ink-300">{item.description}</p>
    </li>
  );
}
