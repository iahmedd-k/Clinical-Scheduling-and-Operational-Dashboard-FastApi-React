import { ChevronRight, FileText } from "lucide-react";

export function PageFrame({ title, detail, children }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-full flex-col gap-4 p-4 sm:p-5">
        <header>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
          {detail ? <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">{detail}</p> : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function Panel({ eyebrow, title, description, children, className = "" }) {
  return (
    <section className={`panel rounded-2xl border border-slate-200/80 p-4 ${className}`}>
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f766e]">{eyebrow}</p> : null}
      <h3 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h3>
      {description ? <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "bg-white",
    mint: "bg-[#ecf8f5]",
    sky: "bg-[#eef6ff]",
    amber: "bg-[#fff8e8]",
  };

  return (
    <section className={`metric-card rounded-xl border border-slate-200/70 p-3.5 ${tones[tone] || tones.neutral}`}>
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
    </section>
  );
}

export function MetaChip({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-[14px] font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function StatusPill({ value, tone = "neutral" }) {
  const tones = {
    success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    danger: "bg-rose-100 text-rose-800 border border-rose-200",
    info: "bg-sky-100 text-sky-800 border border-sky-200",
    neutral: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize tracking-wide ${tones[tone] || tones.neutral}`}>
      {String(value || "").replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

export function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className="max-w-[70%] text-right text-[13px] font-semibold text-slate-950">{String(value ?? "-")}</span>
    </div>
  );
}

export function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[14px] font-semibold text-slate-950">{String(value ?? "-")}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = FileText, title, detail }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
      <Icon className="mx-auto text-slate-400" size={22} />
      <p className="mt-3 text-[14px] font-semibold tracking-[-0.01em] text-slate-900">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export function ActionButton({ children, tone = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-[#0f766e] text-white hover:bg-[#0b665f]",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold tracking-[-0.01em] transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ListRow({ title, subtitle, status, tone = "neutral", onClick }) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <b className="block text-[14px] text-slate-950">{title}</b>
        <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>
      </div>
      {status ? <StatusPill value={status} tone={tone} /> : <ChevronRight className="text-slate-400" size={14} />}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-3.5">{content}</div>;
}
