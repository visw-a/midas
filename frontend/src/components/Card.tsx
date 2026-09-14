import type { ReactNode } from "react";

/** A bordered report section: title bar with a hairline rule beneath it,
 * content below. Deliberately not a rounded, shadowed "card" -- the goal is
 * a printed statement/terminal feel, not a SaaS dashboard tile. */
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
    <div className={`border border-navy-200 bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-navy-800 px-5 py-3">
          <div>
            {title && <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
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
    <div className="border border-navy-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-500">{label}</p>
      <p className="mt-1.5 tabular-nums text-[1.65rem] font-bold leading-none text-navy-900">{value}</p>
      {sub && <p className={`mt-2 text-xs leading-snug ${subClassName}`}>{sub}</p>}
    </div>
  );
}

export function LoadingBlock() {
  return <div className="flex h-40 items-center justify-center text-sm text-navy-500">Loading…</div>;
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="border border-navy-800 bg-navy-50 p-4 text-sm font-semibold text-navy-900">{message}</div>
  );
}

/** solid = filled navy, used to draw the eye (a real flag/alert/live indicator).
 *  outline = neutral navy-on-white, used for routine/informational labels.
 *  Rectangular, not a pill -- reads as a document tag, not a UI chip. */
export function Tag({ children, tone = "outline" }: { children: ReactNode; tone?: "outline" | "solid" }) {
  return tone === "solid" ? (
    <span className="inline-block bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      {children}
    </span>
  ) : (
    <span className="inline-block border border-navy-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-600">
      {children}
    </span>
  );
}
