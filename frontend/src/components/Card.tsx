import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-navy-200 bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-navy-100 pb-3">
          <div>
            {title && <h3 className="text-sm font-bold uppercase tracking-wide text-navy-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  subClassName = "text-navy-500",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-navy-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-navy-500">{label}</p>
      <p className="mt-2 tabular-nums text-2xl font-bold text-navy-900">{value}</p>
      {sub && <p className={`mt-1 text-xs ${subClassName}`}>{sub}</p>}
    </div>
  );
}

export function LoadingBlock() {
  return <div className="flex h-40 items-center justify-center text-sm text-navy-500">Loading…</div>;
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-navy-800 bg-navy-50 p-4 text-sm font-semibold text-navy-900">
      {message}
    </div>
  );
}

/** solid = filled navy, used to draw the eye (a real flag/alert/live indicator).
 *  outline = neutral navy-on-white, used for routine/informational labels. */
export function Pill({ children, tone = "outline" }: { children: ReactNode; tone?: "outline" | "solid" }) {
  return tone === "solid" ? (
    <span className="rounded-full bg-navy-800 px-2 py-0.5 text-xs font-semibold text-white">{children}</span>
  ) : (
    <span className="rounded-full border border-navy-300 px-2 py-0.5 text-xs font-medium text-navy-600">
      {children}
    </span>
  );
}
