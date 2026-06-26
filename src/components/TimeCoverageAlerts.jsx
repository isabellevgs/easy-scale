import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import {
  formatTimeCoverageViolationMessage,
  mergeConsecutiveCoverageViolations,
} from "../lib/timeCoverageRules";

export default function TimeCoverageAlerts({ violations }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => {
    const merged = mergeConsecutiveCoverageViolations(violations);
    return merged.map((violation) => formatTimeCoverageViolationMessage(violation));
  }, [violations]);

  if (!items.length) return null;

  const summary =
    items.length === 1
      ? "1 período com cobertura insuficiente nesta semana"
      : `${items.length} períodos com cobertura insuficiente nesta semana`;

  return (
    <div className="export-skip mb-4 rounded-xl border border-bad/25 bg-bad/5 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-left transition-colors hover:text-ink"
        aria-expanded={open}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-bad" />
        <p className="min-w-0 flex-1 text-[13px] font-medium text-ink">{summary}</p>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5 border-t border-bad/15 pt-2 pl-6">
          {items.map((item) => (
            <li key={item.id} className="text-[12px] leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">{item.headline}</span>
              <span className="text-ink-faint"> · </span>
              {item.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
