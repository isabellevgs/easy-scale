import { STAFFING_STATUS, staffingStatusStyles } from "../lib/shiftNeeds";

const ITEMS = [
  { status: STAFFING_STATUS.OK, label: "Meta atingida" },
  { status: STAFFING_STATUS.SHORT, label: "Faltam pessoas" },
  { status: STAFFING_STATUS.OVER, label: "Acima da meta" },
];

export default function StaffingLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-soft">
      {ITEMS.map(({ status, label }) => {
        const styles = staffingStatusStyles(status);
        return (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full border"
              style={{ background: styles.bg, borderColor: styles.border }}
            />
            {label}
          </span>
        );
      })}
    </div>
  );
}
