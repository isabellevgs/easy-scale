import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { normalizePersonIntervalMinutes } from "./constants";
import { normalizeScaleType, SCALE_TYPES } from "./rules";
import { toISODate } from "./schedule";

export function shiftDurationMinutes({ start, end }) {
  if (typeof start !== "string" || typeof end !== "string") return 0;

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  if (!Number.isFinite(startH) || !Number.isFinite(startM) || !Number.isFinite(endH) || !Number.isFinite(endM)) {
    return 0;
  }

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return endMinutes - startMinutes;
}

export function formatWorkloadDuration(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes === 0) return "0min";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (remainder > 0) parts.push(`${remainder}min`);
  return parts.join(" ");
}

/** Valor compacto para células da grade (ex.: 47h ou —). */
export function formatWorkloadCell(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes === 0) return "—";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return formatWorkloadDuration(minutes);
}

function filterOccurrencesInRange(occurrences, rangeStartISO, rangeEndISO) {
  return occurrences.filter(
    (occ) =>
      (!rangeStartISO || occ.date >= rangeStartISO) &&
      (!rangeEndISO || occ.date <= rangeEndISO)
  );
}

/** Intervalo descontado em cada ocorrência de escala regular. */
export function occurrenceUsesInterval(occ) {
  return normalizeScaleType(occ?.scaleType) === SCALE_TYPES.REGULAR;
}

function createEmptyTotals() {
  return { daysWorked: 0, shiftMinutes: 0, intervalMinutes: 0, netMinutes: 0 };
}

function addTotals(target, source) {
  target.daysWorked += source.daysWorked;
  target.shiftMinutes += source.shiftMinutes;
  target.intervalMinutes += source.intervalMinutes;
  target.netMinutes += source.netMinutes;
}

export function computePersonWorkload(
  person,
  personOccurrences,
  shiftsById,
  rangeStartISO,
  rangeEndISO
) {
  const intervalPerShift = normalizePersonIntervalMinutes(person?.intervalMinutes);
  const scoped = filterOccurrencesInRange(personOccurrences, rangeStartISO, rangeEndISO);
  const daysWorked = new Set();
  let shiftMinutes = 0;
  let intervalMinutes = 0;

  for (const occ of scoped) {
    const shift = shiftsById[occ.shift];
    if (!shift) continue;

    daysWorked.add(occ.date);
    shiftMinutes += shiftDurationMinutes(shift);
    if (occurrenceUsesInterval(occ)) {
      intervalMinutes += intervalPerShift;
    }
  }

  return {
    personId: person.id,
    daysWorked: daysWorked.size,
    shiftMinutes,
    intervalMinutes,
    netMinutes: Math.max(0, shiftMinutes - intervalMinutes),
    intervalPerShift,
  };
}

function formatRangeDate(dateISO) {
  return format(parseISO(dateISO), "dd/MM", { locale: ptBR });
}

export function getMonthWeekRanges(monthStartISO, monthEndISO) {
  const monthStart = parseISO(monthStartISO);
  const monthEnd = parseISO(monthEndISO);
  let cursor = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weeks = [];

  while (cursor <= monthEnd) {
    const weekStartISO = toISODate(cursor);
    const weekEndISO = toISODate(addDays(cursor, 6));
    const rangeStartISO = weekStartISO < monthStartISO ? monthStartISO : weekStartISO;
    const rangeEndISO = weekEndISO > monthEndISO ? monthEndISO : weekEndISO;
    const isPartial = rangeStartISO !== weekStartISO || rangeEndISO !== weekEndISO;

    weeks.push({
      weekStartISO,
      weekEndISO,
      rangeStartISO,
      rangeEndISO,
      isPartial,
      rangeLabel: `${formatRangeDate(rangeStartISO)} – ${formatRangeDate(rangeEndISO)}`,
      title: `Sem ${formatRangeDate(weekStartISO)} – ${formatRangeDate(weekEndISO)}`,
      hint: isPartial
        ? `Só dias de ${formatRangeDate(rangeStartISO)} a ${formatRangeDate(rangeEndISO)} entram neste mês`
        : null,
    });

    cursor = addDays(cursor, 7);
  }

  return weeks;
}

function buildOccurrencesByPerson(occurrences) {
  const map = new Map();
  for (const occ of occurrences) {
    if (!map.has(occ.personId)) map.set(occ.personId, []);
    map.get(occ.personId).push(occ);
  }
  return map;
}

function buildPersonRows(people, occurrencesByPerson, shiftsById, rangeStartISO, rangeEndISO) {
  return people.map((person) => ({
    person,
    ...computePersonWorkload(
      person,
      occurrencesByPerson.get(person.id) || [],
      shiftsById,
      rangeStartISO,
      rangeEndISO
    ),
  }));
}

function sumRowTotals(rows) {
  return rows.reduce((acc, row) => {
    addTotals(acc, row);
    return acc;
  }, createEmptyTotals());
}

export function computeMonthlyWorkloadByWeek({
  people,
  occurrences,
  shiftsById,
  monthStartISO,
  monthEndISO,
}) {
  const monthOccurrences = filterOccurrencesInRange(occurrences, monthStartISO, monthEndISO);
  const occurrencesByPerson = buildOccurrencesByPerson(monthOccurrences);
  const weeks = getMonthWeekRanges(monthStartISO, monthEndISO).map((week) => {
    const rows = buildPersonRows(
      people,
      occurrencesByPerson,
      shiftsById,
      week.rangeStartISO,
      week.rangeEndISO
    );

    return {
      ...week,
      rows,
      totals: sumRowTotals(rows),
    };
  });

  const monthRows = buildPersonRows(
    people,
    occurrencesByPerson,
    shiftsById,
    monthStartISO,
    monthEndISO
  );

  return {
    weeks,
    monthRows,
    monthTotals: sumRowTotals(monthRows),
  };
}

export function computeWorkloadGrid({
  people,
  occurrences,
  shiftsById,
  monthStartISO,
  monthEndISO,
}) {
  const summary = computeMonthlyWorkloadByWeek({
    people,
    occurrences,
    shiftsById,
    monthStartISO,
    monthEndISO,
  });

  const rows = people.map((person) => {
    const weeks = summary.weeks.map((week) => {
      const row = week.rows.find((item) => item.person.id === person.id);
      return row?.netMinutes ?? 0;
    });
    const monthRow = summary.monthRows.find((item) => item.person.id === person.id);

    return {
      person,
      weeks,
      monthNetMinutes: monthRow?.netMinutes ?? 0,
    };
  });

  return {
    weekColumns: summary.weeks.map((week, index) => ({
      index: index + 1,
      label: `Semana ${index + 1}`,
      rangeLabel: week.rangeLabel,
      title: week.title,
      hint: week.hint,
      isPartial: week.isPartial,
    })),
    rows,
    hasScheduledHours: summary.monthTotals.netMinutes > 0,
  };
}

/** @deprecated Use computeMonthlyWorkloadByWeek. */
export function computeWorkloadSummary({
  people,
  occurrences,
  shiftsById,
  rangeStartISO,
  rangeEndISO,
}) {
  const scopedOccurrences = filterOccurrencesInRange(occurrences, rangeStartISO, rangeEndISO);
  const occurrencesByPerson = buildOccurrencesByPerson(scopedOccurrences);
  const rows = buildPersonRows(people, occurrencesByPerson, shiftsById, rangeStartISO, rangeEndISO);

  return {
    rows,
    totals: sumRowTotals(rows),
  };
}
