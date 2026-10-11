import type { ComponentType, ReactNode } from "react";

/** Glassmorphism card matching the Atlas theme. */
export function Card({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}

/** Single KPI tile on the Overview grid. */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </div>
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 ${accent}`}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </Card>
  );
}

/** Pulsing placeholder row for tables/grids while data loads. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-white/[0.04]"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

/** Centered error state with a retry action. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="text-sm text-rose-300/90">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-white/25 hover:text-white"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Empty-state placeholder for tables. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-14 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

/** Formats an ISO timestamp as a short date; empty string when unparseable. */
export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
