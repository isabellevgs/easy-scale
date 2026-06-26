import { addYears, format, parseISO } from "date-fns";
import { getOccurrences, toISODate } from "./schedule";
import {
  canCombineScaleTypesOnSameDay,
  describeScaleType,
  normalizeScaleType,
  SCALE_TYPES,
} from "./rules";
import { getLastCustomOccurrenceDate } from "./customRecurrence";

function shiftLabel(shiftsById, shiftId) {
  return shiftsById?.[shiftId]?.label ?? "outro turno";
}

function formatDateLabel(dateISO) {
  return format(parseISO(dateISO), "dd/MM/yyyy");
}

/** Segunda a sexta, exceto feriados cadastrados. */
export function isWeekdayScheduleDay(dateISO, holidays = []) {
  if (typeof dateISO !== "string" || holidays.includes(dateISO)) return false;
  const day = new Date(`${dateISO}T00:00:00`).getDay();
  return day >= 1 && day <= 5;
}

/** Escala regular: no máximo um turno por pessoa em qualquer dia (inclui sáb, dom e feriados). */
export function requiresSingleShiftPerPerson(_dateISO, _holidays = []) {
  return true;
}

export function findConflictingShiftForPerson(
  dayOccurrences,
  { personId, shiftId, scaleType = SCALE_TYPES.REGULAR }
) {
  const candidateType = normalizeScaleType(scaleType);

  for (const occ of dayOccurrences || []) {
    if (occ.personId !== personId || occ.shift === shiftId) continue;
    if (!canCombineScaleTypesOnSameDay(candidateType, occ.scaleType)) {
      return occ.shift;
    }
  }

  return null;
}

export function getPersonOtherShiftOnDate(
  rules,
  { personId, shiftId, dateISO, scaleType = SCALE_TYPES.REGULAR },
  holidays = []
) {
  if (!requiresSingleShiftPerPerson(dateISO, holidays)) return null;

  const occurrences = getOccurrences(rules, dateISO, dateISO, holidays);
  return findConflictingShiftForPerson(occurrences, { personId, shiftId, scaleType });
}

export function validatePersonCanJoinShiftOnDate(
  rules,
  { personId, shiftId, dateISO, scaleType = SCALE_TYPES.REGULAR },
  holidays = [],
  shiftsById = {}
) {
  if (!requiresSingleShiftPerPerson(dateISO, holidays)) {
    return { ok: true };
  }

  const otherShiftId = getPersonOtherShiftOnDate(
    rules,
    { personId, shiftId, dateISO, scaleType },
    holidays
  );
  if (!otherShiftId) return { ok: true };

  const candidateType = normalizeScaleType(scaleType);
  const occurrences = getOccurrences(rules, dateISO, dateISO, holidays);
  const conflictingOcc = occurrences.find(
    (occ) =>
      occ.personId === personId &&
      occ.shift === otherShiftId &&
      !canCombineScaleTypesOnSameDay(candidateType, occ.scaleType)
  );

  if (
    candidateType === SCALE_TYPES.REGULAR &&
    normalizeScaleType(conflictingOcc?.scaleType) === SCALE_TYPES.PLANTAO
  ) {
    return {
      ok: false,
      error: `Escala regular e plantão no mesmo dia (já escalado(a) no turno ${shiftLabel(
        shiftsById,
        otherShiftId
      )}).`,
      conflictShiftId: otherShiftId,
    };
  }

  return {
    ok: false,
    error: `Já escalado(a) no turno ${shiftLabel(shiftsById, otherShiftId)} neste dia.`,
    conflictShiftId: otherShiftId,
  };
}

function getRuleValidationRange(rule) {
  const rec = rule.recurrence || {};

  if (rec.type === "specific_date" && rec.date) {
    return { start: rec.date, end: rec.date };
  }

  if (rec.type === "specific_dates" && rec.dates?.length) {
    const sorted = [...rec.dates].sort();
    return { start: sorted[0], end: sorted[sorted.length - 1] };
  }

  if (rec.type === "custom") {
    const start = rule.startDate || toISODate(new Date());
    if (rec.endType === "on_date" && rec.endDate) {
      return { start, end: rec.endDate };
    }
    if (rec.endType === "after_count") {
      const lastDate = getLastCustomOccurrenceDate(rule);
      return { start, end: lastDate || format(addYears(parseISO(start), 1), "yyyy-MM-dd") };
    }
    return {
      start,
      end: format(addYears(parseISO(start), 2), "yyyy-MM-dd"),
    };
  }

  const start = rule.startDate || toISODate(new Date());
  const end = rule.endDate || format(addYears(parseISO(start), 1), "yyyy-MM-dd");
  return { start, end };
}

function buildRulesWithCandidate(rules, candidateRule, excludeRuleId) {
  const normalized = { ...candidateRule, shifts: [...(candidateRule.shifts || [])] };

  if (excludeRuleId) {
    return rules.map((rule) => (rule.id === excludeRuleId ? { ...rule, ...normalized, id: rule.id } : rule));
  }

  return [...rules, { ...normalized, id: candidateRule.id || "__candidate__" }];
}

function buildScaleTypeConflictError(occA, occB, shiftsById = {}) {
  const typeA = normalizeScaleType(occA.scaleType);
  const typeB = normalizeScaleType(occB.scaleType);
  const dateLabel = formatDateLabel(occA.date);
  const sameShift = occA.shift === occB.shift;

  if (typeA === SCALE_TYPES.REGULAR && typeB === SCALE_TYPES.REGULAR) {
    if (sameShift) {
      return `Conflito em ${dateLabel}: mais de uma escala regular no turno ${shiftLabel(
        shiftsById,
        occA.shift
      )}. Só é permitido uma escala regular por turno; hora extra pode coexistir.`;
    }

    return `Conflito em ${dateLabel}: mesma pessoa no turno ${shiftLabel(
      shiftsById,
      occA.shift
    )} e ${shiftLabel(shiftsById, occB.shift)}.`;
  }

  if (
    (typeA === SCALE_TYPES.REGULAR && typeB === SCALE_TYPES.PLANTAO) ||
    (typeA === SCALE_TYPES.PLANTAO && typeB === SCALE_TYPES.REGULAR)
  ) {
    if (sameShift) {
      return `Conflito em ${dateLabel}: escala regular e plantão no turno ${shiftLabel(
        shiftsById,
        occA.shift
      )}.`;
    }

    return `Conflito em ${dateLabel}: escala regular e plantão no mesmo dia (turnos ${shiftLabel(
      shiftsById,
      occA.shift
    )} e ${shiftLabel(shiftsById, occB.shift)}).`;
  }

  return `Conflito em ${dateLabel}: combinação não permitida entre ${describeScaleType(
    typeA
  )} e ${describeScaleType(typeB)}.`;
}

function validateScaleTypeCombinationsOnDay(occurrences, shiftsById = {}) {
  const byDatePerson = new Map();

  for (const occ of occurrences) {
    const key = `${occ.date}|${occ.personId}`;
    if (!byDatePerson.has(key)) byDatePerson.set(key, []);
    byDatePerson.get(key).push(occ);
  }

  for (const occs of byDatePerson.values()) {
    for (let i = 0; i < occs.length; i++) {
      for (let j = i + 1; j < occs.length; j++) {
        const occA = occs[i];
        const occB = occs[j];

        if (canCombineScaleTypesOnSameDay(occA.scaleType, occB.scaleType)) continue;

        return {
          ok: false,
          error: buildScaleTypeConflictError(occA, occB, shiftsById),
        };
      }
    }
  }

  return { ok: true };
}

export function validateRuleSingleShiftPerDay(rules, candidateRule, holidays = [], options = {}) {
  const { excludeRuleId, shiftsById = {} } = options;
  const shifts = candidateRule.shifts || [];

  if (shifts.length === 0 || !candidateRule.personId) {
    return { ok: true };
  }

  const testRules = buildRulesWithCandidate(rules, candidateRule, excludeRuleId);
  const { start, end } = getRuleValidationRange(candidateRule);
  const occurrences = getOccurrences(testRules, start, end, holidays);

  return validateScaleTypeCombinationsOnDay(occurrences, shiftsById);
}
