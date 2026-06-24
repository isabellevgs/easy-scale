import { useMemo, useRef, useState } from "react";
import { addDays, startOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Card } from "../components/ui";
import ExportButton from "../components/ExportButton";
import ExportFrame from "../components/ExportFrame";
import ScheduleViewToggle from "../components/ScheduleViewToggle";
import StaffingLegend from "../components/StaffingLegend";
import ShiftStaffingPeopleModal from "../components/ShiftStaffingPeopleModal";
import WeekScheduleTable from "../components/WeekScheduleTable";
import { getOccurrences, toISODate, groupByDate, filterOccurrencesByPerson, formatShiftDateLabel } from "../lib/schedule";
import { SCHEDULE_VIEW, useScheduleViewMode } from "../hooks/useScheduleViewMode";
import { usePersonFilter } from "../hooks/usePersonFilter";
import { useShifts } from "../hooks/useShifts";
import PersonFilterSelect from "../components/PersonFilterSelect";
import ScheduleInconsistencies from "../components/ScheduleInconsistencies";
import { formatMonthPeriodLabels } from "../lib/consistencyRules";
import PageContainer from "../components/PageContainer";

export default function WeekPage({
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useScheduleViewMode();
  const { personIds: personFilterIds, setPersonIds: setPersonFilterIds } = usePersonFilter(people);
  const [staffingModal, setStaffingModal] = useState(null);
  const exportRef = useRef(null);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
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
  const filteredOccurrences = useMemo(
    () => filterOccurrencesByPerson(occurrences, personFilterIds),
    [occurrences, personFilterIds]
  );
  const occByDate = useMemo(() => groupByDate(filteredOccurrences), [filteredOccurrences]);
  const fullOccByDate = useMemo(() => groupByDate(occurrences), [occurrences]);

  const todayISO = toISODate(new Date());
  const rangeLabelRaw = `${format(days[0], "dd 'de' MMM", { locale: ptBR })} – ${format(
    days[6],
    "dd 'de' MMM",
    { locale: ptBR }
  )}`;
  const rangeLabel = rangeLabelRaw.replace(/(^|– )([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
  const exportSubtitle =
    viewMode === SCHEDULE_VIEW.NEEDS ? "Escala semanal · Necessidade" : "Escala semanal";
  const monthKeys = useMemo(
    () => [...new Set(days.map((day) => format(day, "yyyy-MM")))],
    [days]
  );
  const inconsistencyPeriodLabel = useMemo(
    () => formatMonthPeriodLabels(monthKeys),
    [monthKeys]
  );

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

      <div className="mb-4">
        <StaffingLegend />
      </div>

      {people.length === 0 ? (
        <EmptyState />
      ) : (
        <ExportFrame
          innerRef={exportRef}
          title={rangeLabel}
          subtitle={exportSubtitle}
          headerExtra={
            <PersonFilterSelect
              className="export-skip"
              people={people}
              value={personFilterIds}
              onChange={setPersonFilterIds}
            />
          }
        >
          <WeekScheduleTable
            days={days}
            shifts={shifts}
            shiftsById={shiftsById}
            occByDate={occByDate}
            fullOccByDate={fullOccByDate}
            shiftNeeds={shiftNeeds}
            holidays={holidays}
            people={people}
            viewMode={viewMode}
            personFilterIds={personFilterIds}
            todayISO={todayISO}
            onOpenStaffing={openStaffingModal}
          />
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
        <CalendarRange className="h-5 w-5 text-ink-faint" />
      </div>
      <h2 className="text-[15px] font-medium text-ink">Cadastre a equipe primeiro</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Adicione pessoas e crie escalas para ver a visão semanal.
      </p>
    </Card>
  );
}
