import { staffingStatusLabel, staffingStatusStyles } from "../lib/shiftNeeds";

export default function ShiftStaffingCard({
  shift,
  required,
  scheduled,
  status,
  compact = false,
  labeled = false,
  onClick,
}) {
  const styles = staffingStatusStyles(status);
  const detail = staffingStatusLabel(status, required, scheduled);
  const interactive = Boolean(onClick);
  const countLabel = required > 0 ? `${scheduled}/${required}` : String(scheduled);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-90 ${
          labeled ? "w-full justify-between gap-1.5" : "gap-1"
        }`}
        style={{ background: styles.bg, borderColor: styles.border, color: styles.text }}
        title={`${shift.label} · ${detail}`}
      >
        {labeled && (
          <span
            className="min-w-0 truncate text-left font-medium"
            style={{ color: shift.color }}
          >
            {shift.label}
          </span>
        )}
        <span className={`tabular-nums ${labeled ? "shrink-0 font-semibold" : "truncate"}`}>
          {countLabel}
        </span>
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
          className="inline-flex items-center text-[11px] font-medium"
          style={{ color: shift.color }}
        >
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
