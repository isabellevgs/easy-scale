import { getOccurrences } from "./schedule";
import { validatePersonCanJoinShiftOnDate, validateRuleSingleShiftPerDay } from "./scheduleValidation";

function getWeekday(dateISO) {
  return new Date(`${dateISO}T00:00:00`).getDay();
}

function mergeSaveResults(results) {
  const failed = results.find((result) => result && result.ok === false);
  return failed || { ok: true };
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
}) {
  if (isPersonScheduledOnShiftDate(rules, { personId, shiftId, dateISO }, holidays)) {
    return Promise.resolve({ ok: true });
  }

  const validation = validatePersonCanJoinShiftOnDate(
    rules,
    { personId, shiftId, dateISO },
    holidays,
    shiftsById
  );
  if (!validation.ok) {
    return Promise.resolve(validation);
  }

  return addRule({
    personId,
    shifts: [shiftId],
    recurrence: { type: "specific_date", date: dateISO },
    startDate: "",
    endDate: "",
  });
}

export async function unschedulePersonOnShiftDate({
  rules,
  updateRule,
  removeRule,
  personId,
  shiftId,
  dateISO,
  holidays,
}) {
  const covering = getRulesCoveringShiftDate(rules, { personId, shiftId, dateISO }, holidays);
  const weekday = getWeekday(dateISO);
  const tasks = [];

  for (const rule of covering) {
    const rec = rule.recurrence;

    if (rec.type === "specific_date" && rec.date === dateISO) {
      if (rule.shifts.length <= 1) {
        tasks.push(removeRule(rule.id));
      } else {
        tasks.push(updateRule(rule.id, { shifts: rule.shifts.filter((id) => id !== shiftId) }));
      }
      continue;
    }

    if (rec.type === "weekly") {
      const weekdays = rec.weekdays || [];
      const shifts = rule.shifts || [];
      const onlyThisShift = shifts.length === 1 && shifts[0] === shiftId;

      if (onlyThisShift) {
        const nextWeekdays = weekdays.filter((day) => day !== weekday);
        if (nextWeekdays.length === 0) tasks.push(removeRule(rule.id));
        else tasks.push(updateRule(rule.id, { recurrence: { ...rec, weekdays: nextWeekdays } }));
      } else if (shifts.includes(shiftId)) {
        tasks.push(updateRule(rule.id, { shifts: shifts.filter((id) => id !== shiftId) }));
      }
      continue;
    }

    tasks.push(removeRule(rule.id));
  }

  if (tasks.length === 0) return { ok: true };
  return mergeSaveResults(await Promise.all(tasks));
}

export function getPersonShiftRuleOnDate(rules, { personId, shiftId, dateISO }, holidays = []) {
  const covering = getRulesCoveringShiftDate(rules, { personId, shiftId, dateISO }, holidays);
  return (
    covering.find((rule) => rule.recurrence.type === "weekly") ||
    covering.find(
      (rule) => rule.recurrence.type === "specific_date" && rule.recurrence.date === dateISO
    ) ||
    covering[0] ||
    null
  );
}

export function isPersonShiftRecurring(rules, params, holidays = []) {
  const rule = getPersonShiftRuleOnDate(rules, params, holidays);
  return rule?.recurrence?.type === "weekly";
}

export async function applyPersonShiftRecurrence(
  { rules, addRule, updateRule, removeRule, holidays, shiftsById },
  { personId, shiftId, dateISO, recurrenceType, weekdays, endDate }
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

  const candidateRule =
    recurrenceType === "specific_date"
      ? {
          personId,
          shifts: [shiftId],
          recurrence: { type: "specific_date", date: dateISO },
          startDate: "",
          endDate: "",
        }
      : {
          personId,
          shifts: [shiftId],
          recurrence: { type: "weekly", weekdays: weekdays?.length ? weekdays : [weekday] },
          startDate: "",
          endDate: endDate || "",
        };

  const validation = validateRuleSingleShiftPerDay(remainingRules, candidateRule, holidays, {
    shiftsById,
  });
  if (!validation.ok) return validation;

  if (recurrenceType === "specific_date") {
    return addRule({
      personId,
      shifts: [shiftId],
      recurrence: { type: "specific_date", date: dateISO },
      startDate: "",
      endDate: "",
    });
  }

  const dayList = weekdays?.length ? weekdays : [weekday];
  return addRule({
    personId,
    shifts: [shiftId],
    recurrence: { type: "weekly", weekdays: dayList },
    startDate: "",
    endDate: endDate || "",
  });
}

export async function togglePersonShiftOnDate(actions, params) {
  const { rules, addRule, updateRule, removeRule, holidays, shiftsById } = actions;
  const { personId, shiftId, dateISO } = params;

  if (isPersonScheduledOnShiftDate(rules, { personId, shiftId, dateISO }, holidays)) {
    return unschedulePersonOnShiftDate({ rules, updateRule, removeRule, personId, shiftId, dateISO, holidays });
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
