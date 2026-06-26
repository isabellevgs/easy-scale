import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "./ui";
import { toISODate, describePersonScaleOverlap } from "../lib/schedule";
import {
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_FULL,
  colorForPerson,
  peopleScheduledIn,
} from "../lib/constants";
import {
  getShiftStaffing,
  isShiftNeedEditable,
  resolveNeedDayIndex,
  staffingCellVisual,
  staffingStatusStyles,
  STAFFING_STATUS,
} from "../lib/shiftNeeds";
import { SCHEDULE_VIEW } from "../hooks/useScheduleViewMode";
import PersonScaleOverlapIcon from "./PersonScaleOverlapIcon";

function cellStatusForRow(row) {
  return row.required > 0 ? row.status : STAFFING_STATUS.NONE;
}

function filterPeopleByIds(scheduled, personFilterIds) {
  if (!personFilterIds?.length) return scheduled;
  const allowed = new Set(personFilterIds);
  return scheduled.filter((person) => allowed.has(person.id));
}

function buildShiftDayCell({
  shift,
  day,
  occByDate,
  staffingOccByDate,
  shiftNeeds,
  holidays,
  shiftsById,
}) {
  const iso = toISODate(day);
  const dayIndex = resolveNeedDayIndex(iso, holidays);
  const applicable = isShiftNeedEditable(dayIndex, shift.id, shiftsById);
  const dayOccurrences = occByDate[iso] || [];
  const staffingDayOccurrences = staffingOccByDate[iso] || [];

  if (!applicable) {
    return { iso, applicable: false, day, dayOccurrences, row: null, cellVisual: null };
  }

  const row = {
    shiftId: shift.id,
    ...getShiftStaffing(
      staffingDayOccurrences,
      shift.id,
      shiftNeeds,
      dayIndex,
      shiftsById
    ),
  };

  return {
    iso,
    applicable: true,
    day,
    dayOccurrences,
    row,
    cellVisual: staffingCellVisual(cellStatusForRow(row)),
  };
}

function ShiftRowLabel({ shift, compact = false }) {
  return (
    <div className={compact ? "px-3 py-2.5" : "min-w-0 py-3 pl-4 pr-3 sm:min-w-[108px] lg:min-w-[120px]"}>
      <p className="text-[13px] font-semibold leading-tight text-ink">{shift.label}</p>
      <p className={`mt-1 leading-snug text-ink-faint ${compact ? "text-[11px]" : "text-[11px]"}`}>
        {shift.time}
      </p>
      {!compact && shift.weekdaysLabel && (
        <p className="mt-0.5 hidden text-[10px] leading-snug text-ink-faint lg:block">
          {shift.weekdaysLabel}
        </p>
      )}
    </div>
  );
}

function CellButton({ onClick, children, className = "", centered = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute inset-0 flex w-full bg-transparent transition-[filter] hover:brightness-110 ${
        centered
          ? "items-center justify-center"
          : "flex-col items-stretch text-left"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function NeedsQuantity({ row, size = "md" }) {
  const { required, scheduled, status } = row;
  const styles = staffingStatusStyles(status);
  const hasNeed = required > 0 || scheduled > 0;

  if (!hasNeed) {
    return <span className="text-[12px] text-ink-faint">—</span>;
  }

  if (required > 0) {
    const pillClass =
      size === "sm"
        ? "min-w-[40px] px-2 py-0.5 text-[11px]"
        : "min-w-[48px] px-2.5 py-1 text-[12px] sm:min-w-[52px] sm:px-3 sm:text-[13px]";

    return (
      <span
        className={`inline-flex items-center justify-center rounded-full font-semibold tabular-nums ${pillClass}`}
        style={{ background: styles.bg, color: styles.text, border: `1px solid ${styles.border}` }}
      >
        {`${scheduled}/${required}`}
      </span>
    );
  }

  return (
    <span className="text-[12px] font-semibold tabular-nums text-ink-soft sm:text-[13px]">
      {scheduled}
    </span>
  );
}

function NeedsCell({ row, onClick }) {
  const { required, scheduled } = row;
  const hasNeed = required > 0 || scheduled > 0;

  if (!hasNeed) {
    return (
      <CellButton centered onClick={onClick} className="hover:!brightness-100 hover:bg-surface-2/60">
        <span className="text-[12px] text-ink-faint">—</span>
      </CellButton>
    );
  }

  return (
    <CellButton centered onClick={onClick} className="px-1">
      <NeedsQuantity row={row} />
    </CellButton>
  );
}

function chipTextColor(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0c0d10" : "#ffffff";
}

function PeopleList({ scheduled, people, shiftOccs }) {
  return (
    <div className="flex w-full flex-col gap-1 px-2 py-2.5">
      {scheduled.map((person) => {
        const color = colorForPerson(person.id, people);
        const overlapLabel = describePersonScaleOverlap(shiftOccs, person.id);
        return (
          <span
            key={person.id}
            className="block w-full break-words rounded-md px-2 py-1 text-left text-[12px] font-semibold leading-snug"
            style={{ backgroundColor: color, color: chipTextColor(color) }}
            title={person.nome}
          >
            <span className="inline-flex items-center gap-1">
              {overlapLabel && (
                <PersonScaleOverlapIcon
                  title={overlapLabel}
                  className="h-3 w-3 shrink-0 text-amber-300 drop-shadow-sm"
                />
              )}
              {person.nome}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function PeopleCell({ dayOccurrences, shift, people, onClick, personFilterIds }) {
  const shiftOccs = dayOccurrences.filter((o) => o.shift === shift.id);
  const scheduled = filterPeopleByIds(peopleScheduledIn(shiftOccs, people), personFilterIds);
  const isEmpty = scheduled.length === 0;

  return (
    <div className="relative h-full min-h-[52px] w-full">
      <button
        type="button"
        onClick={onClick}
        className={`absolute inset-0 z-0 flex w-full bg-transparent transition-[filter] hover:brightness-110 ${
          isEmpty ? "items-center justify-center" : "flex-col items-stretch text-left"
        }`}
      >
        {isEmpty ? <span className="text-[11px] text-ink-faint">Sem escala</span> : null}
      </button>
      {!isEmpty && (
        <div className="relative z-10 pointer-events-none">
          <PeopleList scheduled={scheduled} people={people} shiftOccs={shiftOccs} />
        </div>
      )}
    </div>
  );
}

function DayHeader({ day, todayISO, compact = false }) {
  const iso = toISODate(day);
  const isToday = iso === todayISO;
  const dayIndex = day.getDay();
  const dayName = compact
    ? WEEKDAY_LABELS[dayIndex]
    : WEEKDAY_LABELS_FULL[dayIndex].split("-")[0];

  return (
    <>
      <p className={`font-semibold leading-tight ${isToday ? "text-brand" : "text-ink"} ${compact ? "text-[10px]" : "text-[12px] sm:text-[13px]"}`}>
        {dayName}
      </p>
      <p
        className={`mt-0.5 tabular-nums ${isToday ? "text-brand/80" : "text-ink-faint"} ${compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"}`}
      >
        {format(day, compact ? "dd/MM" : "dd/MM", { locale: ptBR })}
      </p>
    </>
  );
}

function NeedsMobileCards({
  shifts,
  displayDays,
  occByDate,
  staffingOccByDate,
  shiftNeeds,
  holidays,
  shiftsById,
  todayISO,
  onOpenStaffing,
}) {
  return (
    <div className="week-needs-mobile space-y-3 sm:hidden">
      {shifts.map((shift) => (
        <div
          key={shift.id}
          className="overflow-hidden rounded-xl border border-border-soft bg-surface"
        >
          <ShiftRowLabel shift={shift} compact />
          <div className="grid grid-cols-7 border-t border-border-soft">
            {displayDays.map((day) => {
              const cell = buildShiftDayCell({
                shift,
                day,
                occByDate,
                staffingOccByDate,
                shiftNeeds,
                holidays,
                shiftsById,
              });

              return (
                <div
                  key={cell.iso}
                  className="flex min-w-0 flex-col border-l border-border-soft first:border-l-0"
                  style={cell.cellVisual ?? undefined}
                >
                  <div
                    className={`border-b border-border-soft/60 px-0.5 py-1.5 text-center ${
                      cell.iso === todayISO ? "bg-brand-soft/40" : "bg-surface-2/40"
                    }`}
                  >
                    <DayHeader day={day} todayISO={todayISO} compact />
                  </div>
                  <button
                    type="button"
                    disabled={!cell.applicable}
                    onClick={() => cell.applicable && onOpenStaffing(cell.day, cell.row)}
                    className={`flex min-h-[44px] flex-1 items-center justify-center px-0.5 py-2 transition-[filter] ${
                      cell.applicable ? "hover:brightness-110" : "cursor-default"
                    }`}
                  >
                    {cell.applicable ? (
                      <NeedsQuantity row={cell.row} size="sm" />
                    ) : (
                      <span className="text-[11px] text-ink-faint/50">—</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WeekScheduleTable({
  days,
  shifts,
  shiftsById,
  occByDate,
  fullOccByDate,
  shiftNeeds,
  holidays,
  people,
  viewMode,
  personFilterIds = [],
  todayISO,
  onOpenStaffing,
}) {
  const staffingOccByDate = fullOccByDate ?? occByDate;
  const displayDays = days;
  const isNeedsView = viewMode === SCHEDULE_VIEW.NEEDS;

  const tableWrapClass = isNeedsView
    ? "week-schedule-table-wrap hidden sm:block"
    : "overflow-x-auto overscroll-x-contain";

  const scrollWrapClass = isNeedsView
    ? "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
    : "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]";

  return (
    <Card className="overflow-hidden p-0">
      {isNeedsView && (
        <NeedsMobileCards
          shifts={shifts}
          displayDays={displayDays}
          occByDate={occByDate}
          staffingOccByDate={staffingOccByDate}
          shiftNeeds={shiftNeeds}
          holidays={holidays}
          shiftsById={shiftsById}
          todayISO={todayISO}
          onOpenStaffing={onOpenStaffing}
        />
      )}

      <div className={isNeedsView ? `${tableWrapClass} ${scrollWrapClass}` : scrollWrapClass}>
        <table
          className={`export-week-table w-full border-collapse text-left ${
            isNeedsView
              ? "table-fixed sm:min-w-[520px] lg:min-w-0"
              : "min-w-[720px]"
          }`}
        >
          {isNeedsView && (
            <colgroup>
              <col className="w-[108px] lg:w-[128px]" />
              {displayDays.map((day) => (
                <col key={toISODate(day)} className="w-[56px] lg:w-[72px]" />
              ))}
            </colgroup>
          )}
          <thead>
            <tr className="border-b border-border-soft">
              <th
                className={`sticky left-0 z-20 bg-surface px-0 py-2.5 pl-4 pr-2 text-left sm:py-3 sm:pr-3 ${
                  isNeedsView ? "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.45)]" : ""
                }`}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Turno
                </span>
              </th>
              {displayDays.map((day) => {
                const iso = toISODate(day);
                const isToday = iso === todayISO;
                return (
                  <th
                    key={iso}
                    className={`px-1 py-2.5 text-center sm:px-2 sm:py-3 ${
                      isToday ? "bg-brand-soft/40" : ""
                    }`}
                  >
                    <DayHeader day={day} todayISO={todayISO} compact={isNeedsView} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift, rowIndex) => (
              <tr
                key={shift.id}
                className={rowIndex < shifts.length - 1 ? "border-b border-border-soft" : ""}
              >
                <td
                  className={`sticky left-0 z-10 border-r border-border-soft bg-surface align-top ${
                    isNeedsView ? "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.45)]" : ""
                  }`}
                >
                  <ShiftRowLabel shift={shift} />
                </td>
                {displayDays.map((day) => {
                  const cell = buildShiftDayCell({
                    shift,
                    day,
                    occByDate,
                    staffingOccByDate,
                    shiftNeeds,
                    holidays,
                    shiftsById,
                  });

                  if (!cell.applicable) {
                    return (
                      <td
                        key={cell.iso}
                        className={`h-px border-l border-border-soft bg-surface-2/30 p-0 align-top ${
                          isNeedsView ? "relative min-h-[48px]" : ""
                        }`}
                      >
                        <div
                          className={
                            isNeedsView
                              ? "absolute inset-0 flex items-center justify-center"
                              : "flex h-full min-h-[52px] items-center justify-center"
                          }
                        >
                          <span className="text-[12px] text-ink-faint/50">—</span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={cell.iso}
                      className={`h-px border-l border-border-soft p-0 align-top ${
                        isNeedsView ? "relative min-h-[48px]" : ""
                      }`}
                      style={cell.cellVisual ?? undefined}
                    >
                      {viewMode === SCHEDULE_VIEW.PEOPLE ? (
                        <PeopleCell
                          shift={shift}
                          dayOccurrences={cell.dayOccurrences}
                          people={people}
                          personFilterIds={personFilterIds}
                          onClick={() => onOpenStaffing(cell.day, cell.row)}
                        />
                      ) : (
                        <NeedsCell row={cell.row} onClick={() => onOpenStaffing(cell.day, cell.row)} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
