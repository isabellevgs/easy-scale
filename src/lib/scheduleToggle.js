import { addDays, format, parseISO, subDays } from "date-fns";
import { getOccurrences } from "./schedule";
import { validateRuleSingleShiftPerDay } from "./scheduleValidation";
import { normalizeScaleType } from "./rules";
import { CUSTOM_END_TYPES } from "./customRecurrence";
import { normalizeRuleIntervalFields, isValidTime } from "./ruleInterval";

export const UNSCHEDULE_SCOPE = {
  DAY: "day",
  FUTURE: "future",
  ALL: "all",
};

const RECURRING_TYPES = new Set(["weekly", "custom", "specific_dates"]);

function getWeekday(dateISO) {
  return new Date(`${dateISO}T00:00:00`).getDay();
}

function mergeSaveResults(results) {
  const failed = results.find((result) => result && result.ok === false);
  return failed || { ok: true };
}

function dayBefore(dateISO) {
  return format(subDays(parseISO(dateISO), 1), "yyyy-MM-dd");
}

function dayAfter(dateISO) {
  return format(addDays(parseISO(dateISO), 1), "yyyy-MM-dd");
}

function ruleOnlyHasShift(rule, shiftId) {
  const shifts = rule.shifts || [];
  return shifts.length === 1 && shifts[0] === shiftId;
}

function removeShiftFromRuleTasks(rule, shiftId, updateRule, removeRule) {
  if (ruleOnlyHasShift(rule, shiftId)) {
    return [removeRule(rule.id)];
  }
  return [updateRule(rule.id, { shifts: rule.shifts.filter((id) => id !== shiftId) })];
}

function hasOccurrencesInRange(rule, shiftId, rangeStartISO, rangeEndISO, holidays) {
  const occurrences = getOccurrences([rule], rangeStartISO, rangeEndISO, holidays);
  return occurrences.some((occ) => occ.shift === shiftId);
}

function hasOccurrencesBefore(rule, shiftId, dateISO, holidays) {
  const farPast = format(subDays(parseISO(dateISO), 366 * 5), "yyyy-MM-dd");
  return hasOccurrencesInRange(rule, shiftId, farPast, dayBefore(dateISO), holidays);
}

function hasOccurrencesAfter(rule, shiftId, dateISO, holidays) {
  const farFuture = format(addDays(parseISO(dateISO), 366 * 5), "yyyy-MM-dd");
  return hasOccurrencesInRange(rule, shiftId, dayAfter(dateISO), farFuture, holidays);
}

function buildContinuationRule(rule, shiftId, startDate) {
  return {
    personId: rule.personId,
    shifts: [shiftId],
    scaleType: normalizeScaleType(rule.scaleType),
    recurrence: structuredClone(rule.recurrence),
    startDate,
    endDate: rule.endDate || "",
  };
}

function excludeSingleDayFromRule(rule, shiftId, dateISO, { updateRule, removeRule, addRule }, holidays) {
  if (!ruleOnlyHasShift(rule, shiftId)) {
    return removeShiftFromRuleTasks(rule, shiftId, updateRule, removeRule);
  }

  const rec = rule.recurrence;

  if (rec.type === "specific_date") {
    if (rec.date === dateISO) return [removeRule(rule.id)];
    return [];
  }

  if (rec.type === "specific_dates") {
    const nextDates = (rec.dates || []).filter((day) => day !== dateISO);
    if (nextDates.length === 0) return [removeRule(rule.id)];
    return [updateRule(rule.id, { recurrence: { ...rec, dates: nextDates } })];
  }

  const before = dayBefore(dateISO);
  const after = dayAfter(dateISO);
  const hasPast = hasOccurrencesBefore(rule, shiftId, dateISO, holidays);
  const hasFuture = hasOccurrencesAfter(rule, shiftId, dateISO, holidays);
  const tasks = [];

  if (hasPast && hasFuture) {
    tasks.push(updateRule(rule.id, { endDate: before }));
    tasks.push(addRule(buildContinuationRule(rule, shiftId, after)));
  } else if (hasPast) {
    tasks.push(updateRule(rule.id, { endDate: before }));
  } else if (hasFuture) {
    tasks.push(updateRule(rule.id, { startDate: after }));
  } else {
    tasks.push(removeRule(rule.id));
  }

  return tasks;
}

function excludeFutureFromRule(rule, shiftId, dateISO, { updateRule, removeRule }) {
  if (!ruleOnlyHasShift(rule, shiftId)) {
    return removeShiftFromRuleTasks(rule, shiftId, updateRule, removeRule);
  }

  const rec = rule.recurrence;
  const before = dayBefore(dateISO);

  if (rec.type === "specific_date") {
    if (rec.date >= dateISO) return [removeRule(rule.id)];
    return [];
  }

  if (rec.type === "specific_dates") {
    const nextDates = (rec.dates || []).filter((day) => day < dateISO);
    if (nextDates.length === 0) return [removeRule(rule.id)];
    return [updateRule(rule.id, { recurrence: { ...rec, dates: nextDates } })];
  }

  if (rule.startDate && rule.startDate >= dateISO) {
    return [removeRule(rule.id)];
  }

  if (rec.type === "custom") {
    return [
      updateRule(rule.id, {
        endDate: before,
        recurrence: {
          ...rec,
          endType: CUSTOM_END_TYPES.ON_DATE,
          endDate: before,
        },
      }),
    ];
  }

  return [updateRule(rule.id, { endDate: before })];
}

export function getPersonShiftRules(rules, personId, shiftId) {
  if (!Array.isArray(rules)) return [];
  return rules.filter(
    (rule) => rule.personId === personId && (rule.shifts || []).includes(shiftId)
  );
}

export function isPersonScheduledOnShiftDate(rules, { personId, shiftId, dateISO }, holidays = []) {
  const occurrences = getOccurrences(rules, dateISO, dateISO, holidays);
  return occurrences.some((occ) => occ.personId === personId && occ.shift === shiftId);
}

export function getRulesCoveringShiftDate(rules, { personId, shiftId, dateISO }, holidays = []) {
  const occurrences = getOccurrences(rules, dateISO, dateISO, holidays).filter(
    (occ) => occ.personId === personId && occ.shift === shiftId
  );
  const ruleIds = [...new Set(occurrences.map((occ) => occ.ruleId))];
  return ruleIds.map((id) => rules.find((rule) => rule.id === id)).filter(Boolean);
}

export function schedulePersonOnShiftDate({
  addRule,
  rules,
  personId,
  shiftId,
  dateISO,
  holidays,
  shiftsById,
  scaleType: scaleTypeParam,
  intervalStart: intervalStartParam,
  intervalEnd: intervalEndParam,
}) {
  if (isPersonScheduledOnShiftDate(rules, { personId, shiftId, dateISO }, holidays)) {
    return Promise.resolve({ ok: true });
  }

  const scaleType = normalizeScaleType(scaleTypeParam);
  const intervalFields = normalizeRuleIntervalFields(
    { intervalStart: intervalStartParam, intervalEnd: intervalEndParam },
    scaleType
  );

  const candidateRule = {
    personId,
    shifts: [shiftId],
    scaleType,
    recurrence: { type: "specific_date", date: dateISO },
    startDate: "",
    endDate: "",
    ...intervalFields,
  };

  const validation = validateRuleSingleShiftPerDay(rules, candidateRule, holidays, { shiftsById });
  if (!validation.ok) return Promise.resolve(validation);

  return addRule({
    personId,
    shifts: [shiftId],
    scaleType,
    recurrence: { type: "specific_date", date: dateISO },
    startDate: "",
    endDate: "",
    ...intervalFields,
  });
}

export async function removePersonShiftOnDate(
  { rules, addRule, updateRule, removeRule, holidays },
  { personId, shiftId, dateISO },
  scope = UNSCHEDULE_SCOPE.DAY
) {
  if (scope === UNSCHEDULE_SCOPE.ALL) {
    const matching = getPersonShiftRules(rules, personId, shiftId);
    const tasks = [];

    for (const rule of matching) {
      tasks.push(...removeShiftFromRuleTasks(rule, shiftId, updateRule, removeRule));
    }

    if (tasks.length === 0) return { ok: true };
    return mergeSaveResults(await Promise.all(tasks));
  }

  const covering = getRulesCoveringShiftDate(rules, { personId, shiftId, dateISO }, holidays);
  const tasks = [];

  for (const rule of covering) {
    if (scope === UNSCHEDULE_SCOPE.FUTURE) {
      tasks.push(...excludeFutureFromRule(rule, shiftId, dateISO, { updateRule, removeRule }));
    } else {
      tasks.push(
        ...excludeSingleDayFromRule(
          rule,
          shiftId,
          dateISO,
          { updateRule, removeRule, addRule },
          holidays
        )
      );
    }
  }

  if (tasks.length === 0) return { ok: true };
  return mergeSaveResults(await Promise.all(tasks));
}

export async function unschedulePersonOnShiftDate({
  rules,
  addRule,
  updateRule,
  removeRule,
  personId,
  shiftId,
  dateISO,
  holidays,
}) {
  return removePersonShiftOnDate(
    { rules, addRule, updateRule, removeRule, holidays },
    { personId, shiftId, dateISO },
    UNSCHEDULE_SCOPE.DAY
  );
}

export function getPersonShiftRuleOnDate(rules, { personId, shiftId, dateISO }, holidays = []) {
  const covering = getRulesCoveringShiftDate(rules, { personId, shiftId, dateISO }, holidays);
  if (!covering.length) return null;

  const withInterval = covering.find(
    (rule) => isValidTime(rule.intervalStart) && isValidTime(rule.intervalEnd)
  );
  if (withInterval) return withInterval;

  return (
    covering.find((rule) => rule.recurrence.type === "custom") ||
    covering.find((rule) => rule.recurrence.type === "weekly") ||
    covering.find((rule) => rule.recurrence.type === "specific_dates") ||
    covering.find(
      (rule) => rule.recurrence.type === "specific_date" && rule.recurrence.date === dateISO
    ) ||
    covering[0] ||
    null
  );
}

export function isPersonShiftRecurring(rules, params, holidays = []) {
  const rule = getPersonShiftRuleOnDate(rules, params, holidays);
  if (!rule) return false;
  const type = rule.recurrence?.type;
  if (type === "specific_dates") {
    return (rule.recurrence.dates || []).length > 1;
  }
  return RECURRING_TYPES.has(type);
}

export async function applyPersonShiftRecurrence(
  { rules, addRule, updateRule, removeRule, holidays, shiftsById },
  { personId, shiftId, dateISO, rulePayload }
) {
  const covering = getRulesCoveringShiftDate(rules, { personId, shiftId, dateISO }, holidays);
  const weekday = getWeekday(dateISO);
  const tasks = [];

  for (const rule of covering) {
    const rec = rule.recurrence;

    if (rec.type === "specific_date" && rec.date === dateISO) {
      if (rule.shifts.length <= 1) tasks.push(removeRule(rule.id));
      else tasks.push(updateRule(rule.id, { shifts: rule.shifts.filter((id) => id !== shiftId) }));
      continue;
    }

    if (rec.type === "specific_dates") {
      const shifts = rule.shifts || [];
      const onlyThisShift = shifts.length === 1 && shifts[0] === shiftId;
      const nextDates = (rec.dates || []).filter((day) => day !== dateISO);

      if (onlyThisShift) {
        if (nextDates.length === 0) tasks.push(removeRule(rule.id));
        else tasks.push(updateRule(rule.id, { recurrence: { ...rec, dates: nextDates } }));
      } else if (shifts.includes(shiftId)) {
        tasks.push(updateRule(rule.id, { shifts: shifts.filter((id) => id !== shiftId) }));
      }
      continue;
    }

    if (rec.type === "weekly") {
      const shifts = rule.shifts || [];
      const onlyThisShift = shifts.length === 1 && shifts[0] === shiftId;

      if (onlyThisShift) {
        const nextWeekdays = (rec.weekdays || []).filter((day) => day !== weekday);
        if (nextWeekdays.length === 0) tasks.push(removeRule(rule.id));
        else tasks.push(updateRule(rule.id, { recurrence: { ...rec, weekdays: nextWeekdays } }));
      } else if (shifts.includes(shiftId)) {
        tasks.push(updateRule(rule.id, { shifts: shifts.filter((id) => id !== shiftId) }));
      }
      continue;
    }

    tasks.push(removeRule(rule.id));
  }

  if (tasks.length > 0) {
    const clearResult = mergeSaveResults(await Promise.all(tasks));
    if (!clearResult.ok) return clearResult;
  }

  const remainingRules = rules.filter(
    (rule) => !covering.some((cleared) => cleared.id === rule.id)
  );

  const candidateRule = {
    personId,
    shifts: [shiftId],
    scaleType: normalizeScaleType(rulePayload.scaleType),
    recurrence: rulePayload.recurrence,
    startDate: rulePayload.startDate || "",
    endDate: rulePayload.endDate || "",
    ...normalizeRuleIntervalFields(rulePayload, rulePayload.scaleType),
  };

  const validation = validateRuleSingleShiftPerDay(remainingRules, candidateRule, holidays, {
    shiftsById,
  });
  if (!validation.ok) return validation;

  return addRule(candidateRule);
}

export async function togglePersonShiftOnDate(actions, params) {
  const { rules, addRule, updateRule, removeRule, holidays, shiftsById } = actions;
  const { personId, shiftId, dateISO } = params;

  if (isPersonScheduledOnShiftDate(rules, { personId, shiftId, dateISO }, holidays)) {
    return unschedulePersonOnShiftDate({
      rules,
      addRule,
      updateRule,
      removeRule,
      personId,
      shiftId,
      dateISO,
      holidays,
    });
  }

  return schedulePersonOnShiftDate({
    addRule,
    rules,
    personId,
    shiftId,
    dateISO,
    holidays,
    shiftsById,
  });
}
