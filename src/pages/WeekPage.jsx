import { useMemo, useRef, useState } from "react";
import { addDays, startOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Card, PersonAvatar, ShiftBadge } from "../components/ui";
import ExportButton from "../components/ExportButton";
import ExportFrame from "../components/ExportFrame";
import ScheduleViewToggle from "../components/ScheduleViewToggle";
import StaffingLegend from "../components/StaffingLegend";
import ShiftStaffingCard from "../components/ShiftStaffingCard";
import ShiftStaffingPeopleModal from "../components/ShiftStaffingPeopleModal";
import { getOccurrences, toISODate, groupByDate } from "../lib/schedule";
import { WEEKDAY_LABELS_FULL, colorForPerson, peopleScheduledIn } from "../lib/constants";
import { getDayStaffingRows } from "../lib/shiftNeeds";
import { SCHEDULE_VIEW, useScheduleViewMode } from "../hooks/useScheduleViewMode";
import { useShifts } from "../context/ShiftsContext";
import { useShell } from "../context/ShellContext";
import PageContainer from "../components/PageContainer";

export default function WeekPage({ people, rules, shiftNeeds, holidays, addRule }) {
  const { shifts } = useShifts();
  const { sidebarCollapsed } = useShell();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useScheduleViewMode();
  const [staffingModal, setStaffingModal] = useState(null);
  const exportRef = useRef(null);
  const shiftIds = useMemo(() => shifts.map((shift) => shift.id), [shifts]);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const rangeStart = toISODate(days[0]);
  const rangeEnd = toISODate(days[6]);

  const occurrences = useMemo(
    () => getOccurrences(rules, rangeStart, rangeEnd, holidays),
    [rules, rangeStart, rangeEnd, holidays]
  );
  const occByDate = useMemo(() => groupByDate(occurrences), [occurrences]);

  const todayISO = toISODate(new Date());
  const rangeLabelRaw = `${format(days[0], "dd 'de' MMM", { locale: ptBR })} – ${format(
    days[6],
    "dd 'de' MMM",
    { locale: ptBR }
  )}`;
  const rangeLabel = rangeLabelRaw.replace(/(^|– )([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
  const exportSubtitle =
    viewMode === SCHEDULE_VIEW.NEEDS ? "Escala semanal · Necessidade" : "Escala semanal";

  function openStaffingModal(day, row, dayOccurrences) {
    const shift = shifts.find((item) => item.id === row.shiftId);
    if (!shift) return;
    setStaffingModal({
      shift,
      required: row.required,
      dateISO: toISODate(day),
      dateLabel: format(day, "dd/MM/yyyy", { locale: ptBR }),
    });
  }

  return (
    <PageContainer size="wide">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border-soft bg-surface">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-ink"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-2 text-[13px] font-medium text-ink-soft hover:text-ink"
            >
              Hoje
            </button>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-ink"
              aria-label="Próxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <ScheduleViewToggle value={viewMode} onChange={setViewMode} />
          <ExportButton
            targetRef={exportRef}
            filenameBase={`escala-semana-${rangeStart}`}
            title={`Escala semanal · ${rangeLabel}`}
          />
        </div>
      </div>

      {viewMode === SCHEDULE_VIEW.NEEDS && (
        <div className="mb-4">
          <StaffingLegend />
        </div>
      )}

      {people.length === 0 ? (
        <EmptyState />
      ) : (
        <ExportFrame innerRef={exportRef} title={rangeLabel} subtitle={exportSubtitle}>
          <div
            className={`export-week-grid grid gap-3 ${
              sidebarCollapsed
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-7"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"
            }`}
          >
            {days.map((day) => {
              const iso = toISODate(day);
              const isToday = iso === todayISO;
              const dayOccurrences = occByDate[iso] || [];
              const staffingRows = getDayStaffingRows(
                dayOccurrences,
                shiftNeeds,
                iso,
                shiftIds,
                holidays
              );

              return (
                <Card
                  key={iso}
                  className={`flex min-w-0 flex-col px-3.5 py-3.5 ${
                    isToday ? "border-brand/50 bg-brand-soft" : ""
                  }`}
                >
                  <div className="mb-2.5">
                    <p
                      className={`text-[12px] font-medium uppercase tracking-wide ${
                        isToday ? "text-brand" : "text-ink-faint"
                      }`}
                    >
                      {WEEKDAY_LABELS_FULL[day.getDay()].slice(0, 3)}
                    </p>
                    <p className={`text-[18px] font-semibold ${isToday ? "text-brand" : "text-ink"}`}>
                      {format(day, "dd")}
                    </p>
                  </div>

                  {viewMode === SCHEDULE_VIEW.PEOPLE ? (
                    dayOccurrences.length === 0 ? (
                      <p className="text-[12px] text-ink-faint">Sem escala</p>
                    ) : (
                      <div className="space-y-2">
                        {shifts.map((shift) => {
                          const shiftOccs = dayOccurrences.filter((o) => o.shift === shift.id);
                          if (shiftOccs.length === 0) return null;
                          return (
                            <div key={shift.id}>
                              <ShiftBadge shiftId={shift.id} size="sm" count={shiftOccs.length} />
                              <div className="mt-1.5 space-y-1">
                                {peopleScheduledIn(shiftOccs, people).map((person) => (
                                  <div key={person.id} className="flex items-start gap-1.5">
                                    <PersonAvatar
                                      nome={person.nome}
                                      color={colorForPerson(person.id, people)}
                                      size={18}
                                    />
                                    <span className="text-[12.5px] leading-tight text-ink-soft">
                                      {person.nome}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : staffingRows.length === 0 ? (
                    <p className="text-[12px] text-ink-faint">Sem escala</p>
                  ) : (
                    <div className="space-y-2">
                      {staffingRows.map((row) => {
                        const shift = shifts.find((item) => item.id === row.shiftId);
                        if (!shift) return null;
                        return (
                          <ShiftStaffingCard
                            key={row.shiftId}
                            shift={shift}
                            required={row.required}
                            scheduled={row.scheduled}
                            status={row.status}
                            onClick={() => openStaffingModal(day, row, dayOccurrences)}
                          />
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </ExportFrame>
      )}

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
      />
    </PageContainer>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3">
        <CalendarRange className="h-5 w-5 text-ink-faint" />
      </div>
      <h2 className="text-[15px] font-medium text-ink">Cadastre a equipe primeiro</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Adicione pessoas e crie escalas para ver a visão semanal.
      </p>
    </Card>
  );
}
