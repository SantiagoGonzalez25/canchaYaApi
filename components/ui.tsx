import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 " +
  "disabled:cursor-not-allowed disabled:bg-slate-100";

export const selectClass = inputClass;

export const textareaClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm " +
  "font-semibold text-white shadow-sm transition hover:bg-teal-800 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white " +
  "px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 " +
  "px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50";

export const cardClass =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40";

export const emptyBoxClass =
  "rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500";

const TONES = {
  neutral: "bg-slate-100 text-slate-700",
  teal: "bg-teal-100 text-teal-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: "error" | "ok" | "info";
  children: ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : kind === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-blue-200 bg-blue-50 text-blue-800";
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl whitespace-pre-line break-words text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "teal",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "teal" | "amber" | "blue" | "violet" | "rose";
}) {
  const tones = {
    teal: "from-teal-50 to-white text-teal-700",
    amber: "from-amber-50 to-white text-amber-700",
    blue: "from-blue-50 to-white text-blue-700",
    violet: "from-violet-50 to-white text-violet-700",
    rose: "from-rose-50 to-white text-rose-700",
  } as const;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={emptyBoxClass}>
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium text-slate-700 ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export function ProgressBar({ value, tone = "teal" }: { value: number; tone?: "teal" | "amber" | "rose" }) {
  const colors = {
    teal: "bg-teal-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  } as const;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${colors[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
