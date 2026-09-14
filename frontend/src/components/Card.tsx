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
    <div className={`rounded-xl border border-ink-800 bg-ink-900/60 p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold tracking-wide text-ink-200">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
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
  subClassName = "text-ink-400",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 font-mono-nums text-2xl font-semibold text-ink-100">{value}</p>
      {sub && <p className={`mt-1 text-xs ${subClassName}`}>{sub}</p>}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-ink-400">
      Loading…
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-loss/30 bg-loss/10 p-4 text-sm text-loss">
      {message}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "good" }) {
  const toneClasses = {
    neutral: "bg-ink-800 text-ink-300",
    warn: "bg-loss/15 text-loss",
    good: "bg-gain/15 text-gain",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses}`}>{children}</span>;
}
