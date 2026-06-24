import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  format,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { WEEKDAY_LABELS, MONTH_LABELS } from "../lib/constants";
import { toISODate, fromISODate } from "../lib/schedule";
import { ptBR } from "date-fns/locale";

export default function DateMultiPicker({ selectedDates = [], onChange }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const baseMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthStart = startOfMonth(baseMonth);
  const monthEnd = endOfMonth(baseMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const gridDays = useMemo(() => {
    const days = [];
    let cur = gridStart;
    while (cur <= gridEnd) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }, [gridStart, gridEnd]);

  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const todayISO = toISODate(new Date());
  const monthLabel = `${MONTH_LABELS[baseMonth.getMonth()]} ${baseMonth.getFullYear()}`;

  function toggleDate(iso) {
    const next = selectedSet.has(iso)
      ? selectedDates.filter((d) => d !== iso)
      : [...selectedDates, iso].sort();
    onChange(next);
  }

  function removeDate(iso) {
    onChange(selectedDates.filter((d) => d !== iso));
  }

  const sortedSelected = useMemo(
    () => [...selectedDates].sort(),
    [selectedDates]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center rounded-lg border border-border-soft bg-surface">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            className="flex h-8 w-8 items-center justify-center text-ink-soft hover:text-ink"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] px-2 text-center text-[13px] font-medium text-ink">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            className="flex h-8 w-8 items-center justify-center text-ink-soft hover:text-ink"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMonthOffset(0)}
          className="text-[12px] font-medium text-brand hover:underline"
        >
          Hoje
        </button>
      </div>

      <div className="rounded-xl border border-border-soft bg-surface-2 p-2">
        <div className="grid grid-cols-7 gap-0.5 pb-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[10px] font-medium text-ink-faint">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {gridDays.map((day) => {
            const iso = toISODate(day);
            const inMonth = isSameMonth(day, baseMonth);
            const isToday = iso === todayISO;
            const isSelected = selectedSet.has(iso);

            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggleDate(iso)}
                aria-pressed={isSelected}
                aria-label={format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                className={`flex h-9 items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
                  isSelected
                    ? "bg-brand text-base"
                    : inMonth
                      ? "text-ink-soft hover:bg-surface-3"
                      : "text-ink-faint/40 hover:bg-surface/60"
                } ${isToday && !isSelected ? "ring-1 ring-brand ring-inset" : ""}`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {sortedSelected.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12px] text-ink-soft">
            {sortedSelected.length} dia{sortedSelected.length !== 1 ? "s" : ""} selecionado
            {sortedSelected.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sortedSelected.map((iso) => (
              <span
                key={iso}
                className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand"
              >
                {format(fromISODate(iso), "dd/MM/yyyy")}
                <button
                  type="button"
                  onClick={() => removeDate(iso)}
                  className="rounded-full p-0.5 hover:bg-brand/20"
                  aria-label={`Remover ${format(fromISODate(iso), "dd/MM/yyyy")}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
