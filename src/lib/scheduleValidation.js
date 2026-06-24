import { addYears, format, parseISO } from "date-fns";
import { getOccurrences, toISODate } from "./schedule";

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

/** Só em dias úteis (seg–sex) vale a regra de um turno por pessoa. */
export function requiresSingleShiftPerPerson(dateISO, holidays = []) {
  return isWeekdayScheduleDay(dateISO, holidays);
}

export function getPersonOtherShiftOnDate(
  rules,
  { personId, shiftId, dateISO },
  holidays = []
) {
  if (!requiresSingleShiftPerPerson(dateISO, holidays)) return null;

  const occurrences = getOccurrences(rules, dateISO, dateISO, holidays);
  return (
    occurrences.find((occ) => occ.personId === personId && occ.shift !== shiftId)?.shift ?? null
  );
}

export function validatePersonCanJoinShiftOnDate(
  rules,
  { personId, shiftId, dateISO },
  holidays = [],
  shiftsById = {}
) {
  if (!requiresSingleShiftPerPerson(dateISO, holidays)) {
    return { ok: true };
  }

  const otherShiftId = getPersonOtherShiftOnDate(rules, { personId, shiftId, dateISO }, holidays);
  if (!otherShiftId) return { ok: true };

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

export function validateRuleSingleShiftPerDay(rules, candidateRule, holidays = [], options = {}) {
  const { excludeRuleId, shiftsById = {} } = options;
  const shifts = candidateRule.shifts || [];

  if (shifts.length > 1) {
    return {
      ok: false,
      error: "Uma pessoa só pode ter um turno por dia útil. Selecione apenas um turno.",
    };
  }

  if (shifts.length === 0 || !candidateRule.personId) {
    return { ok: true };
  }

  const testRules = buildRulesWithCandidate(rules, candidateRule, excludeRuleId);
  const { start, end } = getRuleValidationRange(candidateRule);
  const occurrences = getOccurrences(testRules, start, end, holidays);
  const shiftsByDatePerson = new Map();

  for (const occ of occurrences) {
    if (!requiresSingleShiftPerPerson(occ.date, holidays)) continue;

    const key = `${occ.date}|${occ.personId}`;
    if (!shiftsByDatePerson.has(key)) {
      shiftsByDatePerson.set(key, new Set());
    }

    const shiftSet = shiftsByDatePerson.get(key);
    if (shiftSet.has(occ.shift)) continue;

    if (shiftSet.size > 0) {
      const existingShiftId = [...shiftSet][0];
      return {
        ok: false,
        error: `Conflito em ${formatDateLabel(occ.date)}: mesma pessoa no turno ${shiftLabel(
          shiftsById,
          existingShiftId
        )} e ${shiftLabel(shiftsById, occ.shift)}.`,
      };
    }

    shiftSet.add(occ.shift);
  }

  return { ok: true };
}
