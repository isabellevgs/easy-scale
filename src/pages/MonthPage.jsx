import { useEffect, useMemo, useRef, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  format,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, Modal, PersonAvatar, ShiftBadge } from "../components/ui";
import ExportButton from "../components/ExportButton";
import ExportFrame from "../components/ExportFrame";
import ScheduleViewToggle from "../components/ScheduleViewToggle";
import StaffingLegend from "../components/StaffingLegend";
import ShiftStaffingCard from "../components/ShiftStaffingCard";
import ShiftStaffingPeopleModal from "../components/ShiftStaffingPeopleModal";
import ScheduleInconsistencies from "../components/ScheduleInconsistencies";
import { formatMonthPeriodLabel } from "../lib/consistencyRules";
import { getOccurrences, toISODate, groupByDate, formatShiftDateLabel } from "../lib/schedule";
import { WEEKDAY_LABELS, MONTH_LABELS, colorForPerson, peopleScheduledIn } from "../lib/constants";
import { getDayStaffingRows } from "../lib/shiftNeeds";
import { SCHEDULE_VIEW } from "../hooks/useScheduleViewMode";
import { useShifts } from "../hooks/useShifts";
import PageContainer from "../components/PageContainer";

export default function MonthPage({
  people,
  rules,
  shiftNeeds,
  holidays,
  consistencyRules,
  onSaveConsistencyRules,
  addRule,
  updateRule,
  removeRule,
}) {
  const { shifts, shiftsById } = useShifts();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayModalView, setDayModalView] = useState(SCHEDULE_VIEW.PEOPLE);
  const [staffingModal, setStaffingModal] = useState(null);
  const exportRef = useRef(null);
  const shiftIds = useMemo(() => shifts.map((shift) => shift.id), [shifts]);

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

  const rangeStart = toISODate(gridStart);
  const rangeEnd = toISODate(gridEnd);

  const occurrences = useMemo(
    () => getOccurrences(rules, rangeStart, rangeEnd, holidays),
    [rules, rangeStart, rangeEnd, holidays]
  );
  const occByDate = useMemo(() => groupByDate(occurrences), [occurrences]);

  const todayISO = toISODate(new Date());
  const monthLabel = `${MONTH_LABELS[baseMonth.getMonth()]} de ${baseMonth.getFullYear()}`;
  const monthKeys = useMemo(() => [format(baseMonth, "yyyy-MM")], [baseMonth]);
  const inconsistencyPeriodLabel = useMemo(
    () => formatMonthPeriodLabel(monthKeys[0]),
    [monthKeys]
  );

  const selectedOccurrences = selectedDay ? occByDate[selectedDay] || [] : [];
  const selectedStaffingRows = selectedDay
    ? getDayStaffingRows(selectedOccurrences, shiftNeeds, selectedDay, shiftIds, holidays, shiftsById)
    : [];

  useEffect(() => {
    if (selectedDay) setDayModalView(SCHEDULE_VIEW.PEOPLE);
  }, [selectedDay]);

  function openStaffingModal(day, row) {
    const shift = shifts.find((item) => item.id === row.shiftId);
    if (!shift) return;
    setStaffingModal({
      shift,
      required: row.required,
      dateISO: toISODate(day),
      dateLabel: formatShiftDateLabel(day),
    });
  }

  return (
    <PageContainer size="wide">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border-soft bg-surface">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-ink"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMonthOffset(0)}
              className="px-2 text-[13px] font-medium text-ink-soft hover:text-ink"
            >
              Hoje
            </button>
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-ink"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <ExportButton
            targetRef={exportRef}
            filenameBase={`escala-mes-${format(baseMonth, "yyyy-MM")}`}
            title={`Escala mensal · ${monthLabel}`}
          />
        </div>
      </div>

      <div className="mb-4">
        <StaffingLegend />
      </div>

      {people.length === 0 ? (
        <EmptyState />
      ) : (
        <ExportFrame
          innerRef={exportRef}
          title={monthLabel}
          subtitle="Escala mensal · Necessidade"
        >
          <Card className="overflow-hidden p-2 sm:p-3">
            <div className="grid grid-cols-7 gap-1 px-1 pb-2 pt-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-center text-[11px] font-medium text-ink-faint">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((day) => {
                const iso = toISODate(day);
                const inMonth = isSameMonth(day, baseMonth);
                const isToday = iso === todayISO;
                const dayOccs = occByDate[iso] || [];
                const staffingRows = getDayStaffingRows(
                  dayOccs,
                  shiftNeeds,
                  iso,
                  shiftIds,
                  holidays,
                  shiftsById
                );
                const hasContent = staffingRows.length > 0;

                return (
                  <button
                    key={iso}
                    onClick={() => hasContent && setSelectedDay(iso)}
                    className={`export-month-cell flex min-h-[92px] flex-col items-start rounded-lg p-1.5 text-left transition-colors sm:min-h-[112px] ${
                      inMonth ? "bg-surface-2" : "bg-surface/40"
                    } ${isToday ? "ring-1 ring-brand" : ""} ${
                      hasContent ? "hover:bg-surface-3" : "cursor-default"
                    }`}
                  >
                    <span
                      className={`text-[12px] font-medium ${
                        !inMonth ? "text-ink-faint/50" : isToday ? "text-brand" : "text-ink-soft"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {hasContent && (
                      <div className="mt-1 flex w-full flex-1 flex-col gap-1">
                        {staffingRows.map((row) => {
                          const shift = shifts.find((item) => item.id === row.shiftId);
                          if (!shift) return null;
                          return (
                            <span
                              key={row.shiftId}
                              className="w-full"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <ShiftStaffingCard
                                shift={shift}
                                required={row.required}
                                scheduled={row.scheduled}
                                status={row.status}
                                compact
                                labeled
                                onClick={() => openStaffingModal(day, row)}
                              />
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </ExportFrame>
      )}

      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(new Date(`${selectedDay}T00:00:00`), "dd/MM/yyyy") : ""}
      >
        <div className="space-y-3">
          <ScheduleViewToggle value={dayModalView} onChange={setDayModalView} />

          {dayModalView === SCHEDULE_VIEW.NEEDS && <StaffingLegend />}

          {dayModalView === SCHEDULE_VIEW.PEOPLE ? (
            selectedOccurrences.length === 0 ? (
              <p className="text-[14px] text-ink-soft">Sem pessoas escaladas.</p>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => {
                  const shiftOccs = selectedOccurrences.filter((occ) => occ.shift === shift.id);
                  if (shiftOccs.length === 0) return null;
                  return (
                    <div key={shift.id}>
                      <ShiftBadge shiftId={shift.id} size="sm" count={shiftOccs.length} />
                      <div className="mt-2 space-y-1.5">
                        {peopleScheduledIn(shiftOccs, people).map((person) => (
                          <div key={person.id} className="flex items-center gap-2">
                            <PersonAvatar
                              nome={person.nome}
                              color={colorForPerson(person.id, people)}
                              size={22}
                            />
                            <span className="text-[14px] text-ink-soft">{person.nome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : selectedStaffingRows.length === 0 ? (
            <p className="text-[14px] text-ink-soft">Sem pessoas escaladas.</p>
          ) : (
            selectedStaffingRows.map((row) => {
              const shift = shifts.find((item) => item.id === row.shiftId);
              if (!shift || !selectedDay) return null;
              return (
                <ShiftStaffingCard
                  key={row.shiftId}
                  shift={shift}
                  required={row.required}
                  scheduled={row.scheduled}
                  status={row.status}
                  onClick={() => openStaffingModal(new Date(`${selectedDay}T00:00:00`), row)}
                />
              );
            })
          )}
        </div>
      </Modal>

      <ShiftStaffingPeopleModal
        open={!!staffingModal}
        onClose={() => setStaffingModal(null)}
        shift={staffingModal?.shift}
        required={staffingModal?.required ?? 0}
        dateLabel={staffingModal?.dateLabel ?? ""}
        dateISO={staffingModal?.dateISO ?? ""}
        rules={rules}
        allPeople={people}
        holidays={holidays}
        addRule={addRule}
        updateRule={updateRule}
        removeRule={removeRule}
      />

      {people.length > 0 && (
        <ScheduleInconsistencies
          people={people}
          rules={rules}
          holidays={holidays}
          shiftsById={shiftsById}
          consistencyRules={consistencyRules}
          onSaveRules={onSaveConsistencyRules}
          monthKeys={monthKeys}
          periodLabel={inconsistencyPeriodLabel}
        />
      )}
    </PageContainer>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3">
        <CalendarDays className="h-5 w-5 text-ink-faint" />
      </div>
      <h2 className="text-[15px] font-medium text-ink">Cadastre a equipe primeiro</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Adicione pessoas e crie escalas para ver o calendário mensal.
      </p>
    </Card>
  );
}
