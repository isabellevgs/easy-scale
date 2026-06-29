import { getOccurrences } from "./schedule";
import { normalizeScaleType } from "./rules";
import { normalizeRuleIntervalFields, isValidTime } from "./ruleInterval";
import { validatePersonCanJoinShiftOnDate, validateRuleSingleShiftPerDay } from "./scheduleValidation";
import {
  isPersonScheduledOnShiftDate,
  removePersonShiftOnDate,
  schedulePersonOnShiftDate,
  getPersonShiftRuleOnDate,
  UNSCHEDULE_SCOPE,
} from "./scheduleToggle";
import { shiftDurationMinutes, occurrenceUsesInterval, formatWorkloadDuration } from "./workload";
import { normalizePersonIntervalMinutes } from "./constants";
import { uid } from "./storage";

export function normalizeSubstitution(raw) {
  if (!raw || typeof raw !== "object") return null;

  const dateISO = typeof raw.dateISO === "string" ? raw.dateISO.trim() : "";
  const shiftId = typeof raw.shiftId === "string" ? raw.shiftId.trim() : "";
  const fromPersonId = typeof raw.fromPersonId === "string" ? raw.fromPersonId.trim() : "";
  const toPersonId = typeof raw.toPersonId === "string" ? raw.toPersonId.trim() : "";
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : uid("sub");
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : new Date().toISOString();
  const note = typeof raw.note === "string" ? raw.note.trim() : "";

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateISO) ||
    !shiftId ||
    !fromPersonId ||
    !toPersonId ||
    fromPersonId === toPersonId
  ) {
    return null;
  }

  return {
    id,
    dateISO,
    shiftId,
    fromPersonId,
    toPersonId,
    scaleType: normalizeScaleType(raw.scaleType),
    ...normalizeRuleIntervalFields(raw, normalizeScaleType(raw.scaleType)),
    note,
    createdAt,
  };
}

export function normalizeSubstitutions(rawSubstitutions) {
  if (!Array.isArray(rawSubstitutions)) return [];

  const seen = new Set();
  const result = [];

  for (const raw of rawSubstitutions) {
    const item = normalizeSubstitution(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return result;
}

export function pruneSubstitutionsForPeople(substitutions, peopleIds) {
  const allowed = new Set(peopleIds);
  return normalizeSubstitutions(substitutions).filter(
    (item) => allowed.has(item.fromPersonId) && allowed.has(item.toPersonId)
  );
}

export function pruneSubstitutionsForShifts(substitutions, shiftIds) {
  const allowed = new Set(shiftIds);
  return normalizeSubstitutions(substitutions).filter((item) => allowed.has(item.shiftId));
}

export function getOutgoingOccurrenceScaleType(rules, { fromPersonId, shiftId, dateISO }, holidays = []) {
  return getOutgoingRuleContext(rules, { fromPersonId, shiftId, dateISO }, holidays)?.scaleType ?? null;
}

/** Escala, tipo e horário de intervalo da pessoa que está saindo. */
export function getOutgoingRuleContext(rules, { fromPersonId, shiftId, dateISO }, holidays = []) {
  const normalizedRules = Array.isArray(rules) ? rules : [];
  const occurrences = getOccurrences(normalizedRules, dateISO, dateISO, holidays).filter(
    (occ) => occ.personId === fromPersonId && occ.shift === shiftId
  );

  if (!occurrences.length) return null;

  const covering = occurrences
    .map((occ) => normalizedRules.find((rule) => rule.id === occ.ruleId))
    .filter(Boolean);

  const ruleWithInterval = covering.find(
    (item) => isValidTime(item.intervalStart) && isValidTime(item.intervalEnd)
  );
  const rule =
    ruleWithInterval ||
    getPersonShiftRuleOnDate(normalizedRules, { fromPersonId, shiftId, dateISO }, holidays) ||
    covering[0] ||
    null;

  const scaleType = normalizeScaleType(rule?.scaleType ?? occurrences[0].scaleType);
  const { intervalStart, intervalEnd } = normalizeRuleIntervalFields(rule ?? {}, scaleType);

  return { scaleType, intervalStart, intervalEnd };
}

function buildSpecificDateRulePayload({
  personId,
  shiftId,
  dateISO,
  scaleType,
  intervalStart,
  intervalEnd,
}) {
  const normalizedScaleType = normalizeScaleType(scaleType);
  return {
    personId,
    shifts: [shiftId],
    scaleType: normalizedScaleType,
    recurrence: { type: "specific_date", date: dateISO },
    startDate: "",
    endDate: "",
    ...normalizeRuleIntervalFields({ intervalStart, intervalEnd }, normalizedScaleType),
  };
}

export function getSubstitutionForPersonOnShift(substitutions, { dateISO, shiftId, toPersonId }) {
  return (
    normalizeSubstitutions(substitutions).find(
      (item) =>
        item.dateISO === dateISO && item.shiftId === shiftId && item.toPersonId === toPersonId
    ) ?? null
  );
}

export function buildSubstitutionLookup(substitutions) {
  const map = new Map();
  for (const item of normalizeSubstitutions(substitutions)) {
    map.set(`${item.dateISO}|${item.shiftId}|${item.toPersonId}`, item);
  }
  return map;
}

export function describeSubstitution(substitution, peopleById) {
  if (!substitution) return "";
  const fromName = peopleById[substitution.fromPersonId]?.nome ?? "—";
  const toName = peopleById[substitution.toPersonId]?.nome ?? "—";
  const notePart = substitution.note ? ` · ${substitution.note}` : "";
  return `Substitui ${fromName}${notePart}`;
}

export function previewSubstitutionWorkloadImpact({ fromPerson, toPerson, shift, scaleType }) {
  if (!shift || !fromPerson || !toPerson) {
    return { fromDeltaMinutes: 0, toDeltaMinutes: 0 };
  }

  const grossMinutes = shiftDurationMinutes(shift);
  const occ = { scaleType: normalizeScaleType(scaleType) };
  const fromInterval = occurrenceUsesInterval(occ)
    ? normalizePersonIntervalMinutes(fromPerson.intervalMinutes)
    : 0;
  const toInterval = occurrenceUsesInterval(occ)
    ? normalizePersonIntervalMinutes(toPerson.intervalMinutes)
    : 0;

  return {
    fromDeltaMinutes: -(grossMinutes - fromInterval),
    toDeltaMinutes: grossMinutes - toInterval,
  };
}

export function formatSubstitutionWorkloadPreview({ fromPerson, toPerson, shift, scaleType }) {
  const { fromDeltaMinutes, toDeltaMinutes } = previewSubstitutionWorkloadImpact({
    fromPerson,
    toPerson,
    shift,
    scaleType,
  });

  if (fromDeltaMinutes === 0 && toDeltaMinutes === 0) return null;

  const parts = [];
  if (fromDeltaMinutes !== 0) {
    parts.push(`${fromPerson.nome} ${formatSignedWorkload(fromDeltaMinutes)}`);
  }
  if (toDeltaMinutes !== 0) {
    parts.push(`${toPerson.nome} ${formatSignedWorkload(toDeltaMinutes)}`);
  }
  return parts.join(" · ");
}

function formatSignedWorkload(minutes) {
  const sign = minutes > 0 ? "+" : "−";
  return `${sign}${formatWorkloadDuration(Math.abs(minutes))}`;
}

function createSubstitutionRecord({
  fromPersonId,
  toPersonId,
  shiftId,
  dateISO,
  scaleType,
  intervalStart,
  intervalEnd,
  note,
}) {
  return normalizeSubstitution({
    id: uid("sub"),
    dateISO,
    shiftId,
    fromPersonId,
    toPersonId,
    scaleType: normalizeScaleType(scaleType),
    intervalStart,
    intervalEnd,
    note,
    createdAt: new Date().toISOString(),
  });
}

export function findSubstitutionById(substitutions, id) {
  if (typeof id !== "string" || !id.trim()) return null;
  return normalizeSubstitutions(substitutions).find((item) => item.id === id) ?? null;
}

export async function revertSubstitution(
  { rules, substitutions, addRule, updateRule, removeRule, removeSubstitutionRecord, holidays, shiftsById },
  substitutionId
) {
  const substitution = findSubstitutionById(substitutions, substitutionId);
  if (!substitution) {
    return { ok: false, error: "Substituição não encontrada." };
  }

  const { fromPersonId, toPersonId, shiftId, dateISO, scaleType, intervalStart, intervalEnd } =
    substitution;

  const joinValidation = validatePersonCanJoinShiftOnDate(
    rules,
    { personId: fromPersonId, shiftId, dateISO, scaleType },
    holidays,
    shiftsById
  );
  if (!joinValidation.ok) return joinValidation;

  const candidateRule = buildSpecificDateRulePayload({
    personId: fromPersonId,
    shiftId,
    dateISO,
    scaleType,
    intervalStart,
    intervalEnd,
  });

  const ruleValidation = validateRuleSingleShiftPerDay(rules, candidateRule, holidays, {
    shiftsById,
  });
  if (!ruleValidation.ok) return ruleValidation;

  if (
    isPersonScheduledOnShiftDate(rules, { personId: toPersonId, shiftId, dateISO }, holidays)
  ) {
    const removeResult = await removePersonShiftOnDate(
      { rules, addRule, updateRule, removeRule, holidays },
      { personId: toPersonId, shiftId, dateISO },
      UNSCHEDULE_SCOPE.DAY
    );
    if (!removeResult.ok) return removeResult;
  }

  const scheduleResult = await schedulePersonOnShiftDate({
    addRule,
    rules,
    personId: fromPersonId,
    shiftId,
    dateISO,
    holidays,
    shiftsById,
    scaleType,
    intervalStart,
    intervalEnd,
  });
  if (!scheduleResult.ok) return scheduleResult;

  if (removeSubstitutionRecord) {
    return removeSubstitutionRecord(substitutionId);
  }

  return { ok: true };
}

export async function substitutePersonOnShiftDate(
  { rules: rulesFromActions, addRule, updateRule, removeRule, addSubstitution, holidays, shiftsById },
  { fromPersonId, toPersonId, shiftId, dateISO, note = "", rules: rulesFromParams, outgoingContext }
) {
  const rules = Array.isArray(rulesFromParams) ? rulesFromParams : rulesFromActions;

  if (!fromPersonId || !toPersonId || !shiftId || !dateISO) {
    return { ok: false, error: "Dados incompletos para substituição." };
  }

  if (fromPersonId === toPersonId) {
    return { ok: false, error: "Selecione uma pessoa diferente da que está saindo." };
  }

  if (
    !isPersonScheduledOnShiftDate(rules, { personId: fromPersonId, shiftId, dateISO }, holidays)
  ) {
    return { ok: false, error: "A pessoa original não está escalada neste turno." };
  }

  if (
    isPersonScheduledOnShiftDate(rules, { personId: toPersonId, shiftId, dateISO }, holidays)
  ) {
    return { ok: false, error: "A substituta já está escalada neste turno." };
  }

  const outgoing =
    outgoingContext ??
    getOutgoingRuleContext(rules, { fromPersonId, shiftId, dateISO }, holidays);
  if (!outgoing) {
    return { ok: false, error: "Não foi possível identificar a escala original." };
  }

  const { scaleType, intervalStart, intervalEnd } = outgoing;

  const joinValidation = validatePersonCanJoinShiftOnDate(
    rules,
    { personId: toPersonId, shiftId, dateISO, scaleType },
    holidays,
    shiftsById
  );
  if (!joinValidation.ok) return joinValidation;

  const candidateRule = buildSpecificDateRulePayload({
    personId: toPersonId,
    shiftId,
    dateISO,
    scaleType,
    intervalStart,
    intervalEnd,
  });

  const ruleValidation = validateRuleSingleShiftPerDay(rules, candidateRule, holidays, {
    shiftsById,
  });
  if (!ruleValidation.ok) return ruleValidation;

  const removeResult = await removePersonShiftOnDate(
    { rules, addRule, updateRule, removeRule, holidays },
    { personId: fromPersonId, shiftId, dateISO },
    UNSCHEDULE_SCOPE.DAY
  );
  if (!removeResult.ok) return removeResult;

  const scheduleResult = await schedulePersonOnShiftDate({
    addRule,
    rules,
    personId: toPersonId,
    shiftId,
    dateISO,
    holidays,
    shiftsById,
    scaleType,
    intervalStart,
    intervalEnd,
  });
  if (!scheduleResult.ok) return scheduleResult;

  const record = createSubstitutionRecord({
    fromPersonId,
    toPersonId,
    shiftId,
    dateISO,
    scaleType,
    intervalStart,
    intervalEnd,
    note,
  });

  if (addSubstitution) {
    return addSubstitution(record);
  }

  return { ok: true, substitution: record };
}
