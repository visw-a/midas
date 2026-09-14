import type { Takeaway, TakeawaySeverity } from "../api/client";
import { formatDate } from "../lib/format";
import { Tag } from "./Card";

const SEVERITY_LABEL: Record<TakeawaySeverity, string> = {
  action: "Action",
  watch: "Watch",
  info: "Note",
};

export function Takeaways({ items, asOfStatement }: { items: Takeaway[]; asOfStatement: string }) {
  const actionCount = items.filter((i) => i.severity === "action").length;
  const watchCount = items.filter((i) => i.severity === "watch").length;

  return (
    <div className="border border-navy-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-navy-800 px-5 py-3">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-800">
            Takeaways &amp; Recommended Action
          </h3>
          <p className="mt-0.5 text-xs text-navy-500">
            Computed from the statement dated {formatDate(asOfStatement)} — what the data says to do with the
            portfolio right now.
          </p>
        </div>
        <p className="whitespace-nowrap text-xs font-semibold text-navy-600">
          {actionCount > 0 && `${actionCount} action${actionCount === 1 ? "" : "s"}`}
          {actionCount > 0 && watchCount > 0 && " · "}
          {watchCount > 0 && `${watchCount} to watch`}
          {actionCount === 0 && watchCount === 0 && "No open flags"}
        </p>
      </div>
      <ol className="divide-y divide-navy-100">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 px-5 py-3.5">
            <div className="w-16 shrink-0 pt-0.5">
              <Tag tone={item.severity === "action" ? "solid" : "outline"}>{SEVERITY_LABEL[item.severity]}</Tag>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-900">{item.headline}</p>
              <p className="mt-0.5 text-sm leading-snug text-navy-600">{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
