import { staffingStatusLabel, staffingStatusStyles } from "../lib/shiftNeeds";

export default function ShiftStaffingCard({
  shift,
  required,
  scheduled,
  status,
  compact = false,
  onClick,
}) {
  const styles = staffingStatusStyles(status);
  const Icon = shift.icon;
  const detail = staffingStatusLabel(status, required, scheduled);
  const interactive = Boolean(onClick);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-90"
        style={{ background: styles.bg, borderColor: styles.border, color: styles.text }}
        title={`${shift.label} · ${detail}`}
      >
        <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2.25} />
        <span className="truncate">{required > 0 ? `${scheduled}/${required}` : scheduled}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`w-full rounded-lg border px-2.5 py-2 text-left ${
        interactive ? "cursor-pointer transition-opacity hover:opacity-90" : "cursor-default"
      }`}
      style={{ background: styles.bg, borderColor: styles.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium"
          style={{ color: shift.color }}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          {shift.label}
        </span>
        {required > 0 && (
          <span className="text-[13px] font-semibold tabular-nums" style={{ color: styles.text }}>
            {scheduled}/{required}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-snug" style={{ color: styles.text }}>
        {detail}
      </p>
    </button>
  );
}
