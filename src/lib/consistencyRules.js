import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getRegularOccurrences } from "./schedule";

export const CONSISTENCY_RULE_TYPES = {
  SHIFT_PER_MONTH: "shift_per_month",
  SHIFT_PER_WEEK: "shift_per_week",
  DAYS_OFF_PER_WEEK: "days_off_per_week",
};

export const CONSISTENCY_RULE_TEMPLATES = [
  {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_MONTH,
    expectedCount: 1,
    label: "Trabalhar 1 turno no mês",
  },
  {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK,
    expectedCount: 1,
    label: "Trabalhar 1 vez na semana",
  },
  {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK,
    expectedCount: 2,
    label: "Trabalhar 2 turnos na semana",
  },
  {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK,
    expectedCount: 3,
    label: "Trabalhar 3 turnos na semana",
  },
  {
    type: CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK,
    expectedCount: 2,
    label: "Dias de folga na semana",
  },
];

const LEGACY_RULE_MAP = {
  one_saturday_per_month: {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_MONTH,
    expectedCount: 1,
    shiftId: "fds_manha",
  },
  two_mornings_per_week: {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK,
    expectedCount: 2,
    shiftId: "manha",
  },
  three_mornings_per_week: {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK,
    expectedCount: 3,
    shiftId: "manha",
  },
  two_nights_per_week: {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK,
    expectedCount: 2,
    shiftId: "noite",
  },
  three_nights_per_week: {
    type: CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK,
    expectedCount: 3,
    shiftId: "noite",
  },
  two_days_off: {
    type: CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK,
    expectedCount: 2,
  },
};

function isValidRuleType(type) {
  return Object.values(CONSISTENCY_RULE_TYPES).includes(type);
}

function resolveShiftId(shiftId, shiftIds) {
  if (!shiftIds.length) return "";
  return shiftIds.includes(shiftId) ? shiftId : shiftIds[0];
}

function normalizePersonIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id) => typeof id === "string" && id.trim()))];
}

function resolvePersonIds(raw) {
  const ids = normalizePersonIds(raw?.personIds);
  if (ids.length > 0) return ids;
  if (Array.isArray(raw?.people)) {
    return normalizePersonIds(raw.people.map((person) => person?.id));
  }
  return [];
}

function normalizeRuleItem(raw, shiftIds, fallbackId) {
  const type = isValidRuleType(raw?.type) ? raw.type : CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK;
  const expectedCount = Math.max(
    1,
    Math.min(type === CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK ? 7 : 7, Number(raw?.expectedCount) || 1)
  );
  const id =
    typeof raw?.id === "string" && raw.id.trim() ? raw.id.trim() : fallbackId;

  if (type === CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK) {
    return { id, type, expectedCount, personIds: resolvePersonIds(raw) };
  }

  return {
    id,
    type,
    expectedCount,
    shiftId: resolveShiftId(raw?.shiftId, shiftIds),
    personIds: resolvePersonIds(raw),
  };
}

export function normalizeConsistencyRules(rawRules, shiftIds = []) {
  if (!Array.isArray(rawRules)) return [];

  const seen = new Set();
  const result = [];

  for (let index = 0; index < rawRules.length; index += 1) {
    const item = normalizeRuleItem(rawRules[index], shiftIds, `cr_legacy_${index}`);
    if (seen.has(item.id)) continue;
    if (item.type !== CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK && !item.shiftId) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

export function createConsistencyRule(template, shiftIds, id) {
  const type = template.type;
  const expectedCount = template.expectedCount;

  if (type === CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK) {
    return {
      id,
      type,
      expectedCount,
      personIds: [],
    };
  }

  return {
    id,
    type,
    expectedCount,
    shiftId: resolveShiftId(template.shiftId, shiftIds),
    personIds: [],
  };
}

function buildShiftRuleCopy(count, shiftLabel, periodLabel) {
  if (count === 1) {
    return {
      title: `Trabalhar 1 vez em ${shiftLabel} ${periodLabel}`,
      titleParts: {
        before: "Trabalhar 1 vez em ",
        highlight: shiftLabel,
        after: ` ${periodLabel}`,
      },
      description: `Trabalhar 1 vez em ${shiftLabel} ${periodLabel}.`,
    };
  }

  return {
    title: `Trabalhar ${count} vezes em ${shiftLabel} ${periodLabel}`,
    titleParts: {
      before: `Trabalhar ${count} vezes em `,
      highlight: shiftLabel,
      after: ` ${periodLabel}`,
    },
    description: `Trabalhar ${count} vezes em ${shiftLabel} ${periodLabel}.`,
  };
}

function formatShiftCountPhrase(count, shiftLabel) {
  if (count === 1) return `1 vez em ${shiftLabel}`;
  return `${count} vezes em ${shiftLabel}`;
}

export function describeConsistencyRule(rule, shiftsById = {}) {
  if (rule.type === CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK) {
    const count = rule.expectedCount;
    const highlight = String(count);
    return {
      title: `${count} dia${count !== 1 ? "s" : ""} de folga na semana`,
      titleParts: {
        before: "",
        highlight,
        after: ` dia${count !== 1 ? "s" : ""} de folga na semana`,
      },
      description: `Possuir ${count} dia${count !== 1 ? "s" : ""} de folga na semana.`,
    };
  }

  const shiftLabel = shiftsById[rule.shiftId]?.label?.toLowerCase() || "turno";
  const count = rule.expectedCount;

  if (rule.type === CONSISTENCY_RULE_TYPES.SHIFT_PER_MONTH) {
    return buildShiftRuleCopy(count, shiftLabel, "no mês");
  }

  return buildShiftRuleCopy(count, shiftLabel, "na semana");
}

function migrateLegacyAssignments(assignments, shiftIds) {
  if (!assignments || typeof assignments !== "object") return [];

  return Object.entries(assignments).flatMap(([legacyId, personIds]) => {
    const template = LEGACY_RULE_MAP[legacyId];
    if (!template || !Array.isArray(personIds) || personIds.length === 0) return [];

    const rule = normalizeRuleItem(
      {
        id: legacyId,
        ...template,
        personIds,
      },
      shiftIds,
      legacyId
    );

    return [rule];
  });
}

function migrateLegacyBackupRules(items, shiftIds) {
  return items.flatMap((item, index) => {
    if (!item?.id) return [];

    const template = LEGACY_RULE_MAP[item.id];
    if (!template) return [];

    const personIds = Array.isArray(item.personIds)
      ? item.personIds
      : Array.isArray(item.people)
        ? item.people.map((person) => person?.id).filter(Boolean)
        : [];

    if (personIds.length === 0) return [];

    return [
      normalizeRuleItem(
        {
          id: item.id,
          ...template,
          personIds,
        },
        shiftIds,
        `cr_legacy_${index}`
      ),
    ];
  });
}

export function resolveConsistencyRules(parsed, shiftIds = []) {
  if (Array.isArray(parsed?.consistencyRules) && parsed.consistencyRules.length > 0) {
    const first = parsed.consistencyRules[0];
    if (isValidRuleType(first?.type)) {
      return normalizeConsistencyRules(parsed.consistencyRules, shiftIds);
    }
    return migrateLegacyBackupRules(parsed.consistencyRules, shiftIds);
  }

  if (parsed?.consistencyRuleAssignments) {
    return migrateLegacyAssignments(parsed.consistencyRuleAssignments, shiftIds);
  }

  return [];
}

export function buildConsistencyRulesForBackup(people, consistencyRules, shiftsById = {}) {
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));

  return consistencyRules.map((rule) => {
    const meta = describeConsistencyRule(rule, shiftsById);
    return {
      ...rule,
      title: meta.title,
      description: meta.description,
      people: (rule.personIds || [])
        .map((id) => peopleById[id])
        .filter(Boolean)
        .map((person) => ({ id: person.id, nome: person.nome })),
    };
  });
}

export function pruneConsistencyRulesForShifts(consistencyRules, shiftIds) {
  return normalizeConsistencyRules(consistencyRules, shiftIds);
}

export function removePersonFromConsistencyRules(consistencyRules, personId) {
  return consistencyRules.map((rule) => ({
    ...rule,
    personIds: (rule.personIds || []).filter((id) => id !== personId),
  }));
}

export function formatMonthPeriodLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const raw = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatWeekPeriodLabel(startISO, endISO) {
  const raw = `${format(parseISO(startISO), "dd/MM")}–${format(parseISO(endISO), "dd/MM")}`;
  return `Sem ${raw}`;
}

function getMonthRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getWeeksOverlappingMonth(monthKey) {
  const { start, end } = getMonthRange(monthKey);
  const weeks = [];
  let cursor = startOfWeek(parseISO(start), { weekStartsOn: 0 });
  const monthEnd = parseISO(end);

  while (cursor <= monthEnd) {
    weeks.push({
      startISO: format(cursor, "yyyy-MM-dd"),
      endISO: format(addDays(cursor, 6), "yyyy-MM-dd"),
    });
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

function buildWeekDates(startISO, endISO) {
  const dates = [];
  let cursor = parseISO(startISO);
  const end = parseISO(endISO);

  while (cursor <= end) {
    dates.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function countShiftDates(occurrences, personId, shiftId) {
  const dates = new Set();

  for (const occ of occurrences) {
    if (occ.personId !== personId) continue;
    if (occ.shift !== shiftId) continue;
    dates.add(occ.date);
  }

  return dates.size;
}

function checkShiftPerMonth(personId, monthOccurrences, monthKey, shiftId, expectedCount, shiftLabel) {
  const { start, end } = getMonthRange(monthKey);
  const filtered = monthOccurrences.filter(
    (occ) => occ.date >= start && occ.date <= end
  );
  const count = countShiftDates(filtered, personId, shiftId);

  if (count === expectedCount) return [];

  return [
    `${formatMonthPeriodLabel(monthKey)}: ${formatShiftCountPhrase(count, shiftLabel)}; esperado ${expectedCount}.`,
  ];
}

function checkShiftPerWeek(
  personId,
  weekOccurrences,
  weekLabel,
  shiftId,
  expectedCount,
  shiftLabel
) {
  const count = countShiftDates(weekOccurrences, personId, shiftId);
  if (count === expectedCount) return [];

  const prefix = weekLabel ? `${weekLabel}: ` : "";
  return [`${prefix}${formatShiftCountPhrase(count, shiftLabel)}; esperado ${expectedCount}.`];
}

function checkDaysOffPerWeek(personId, weekOccurrences, weekDates, weekLabel, minOffDays) {
  const workedDates = new Set(
    weekOccurrences.filter((occ) => occ.personId === personId).map((occ) => occ.date)
  );
  const offDays = weekDates.filter((dateISO) => !workedDates.has(dateISO)).length;

  if (offDays >= minOffDays) return [];

  const prefix = weekLabel ? `${weekLabel}: ` : "";
  return [`${prefix}Apenas ${offDays} dia(s) de folga; esperado pelo menos ${minOffDays}.`];
}

function checkRuleForPerson(
  ruleDef,
  personId,
  monthKey,
  monthOccurrences,
  weeks,
  scheduleRules,
  holidays,
  shiftsById
) {
  const details = [];
  const shiftLabel = shiftsById[ruleDef.shiftId]?.label?.toLowerCase() || "turno(s)";

  if (ruleDef.type === CONSISTENCY_RULE_TYPES.SHIFT_PER_MONTH) {
    return checkShiftPerMonth(
      personId,
      monthOccurrences,
      monthKey,
      ruleDef.shiftId,
      ruleDef.expectedCount,
      shiftLabel
    );
  }

  for (const week of weeks) {
    const weekLabel = formatWeekPeriodLabel(week.startISO, week.endISO);
    const weekOccurrences = getRegularOccurrences(
      scheduleRules,
      week.startISO,
      week.endISO,
      holidays
    );
    const weekDates = buildWeekDates(week.startISO, week.endISO);

    if (ruleDef.type === CONSISTENCY_RULE_TYPES.SHIFT_PER_WEEK) {
      details.push(
        ...checkShiftPerWeek(
          personId,
          weekOccurrences,
          weekLabel,
          ruleDef.shiftId,
          ruleDef.expectedCount,
          shiftLabel
        )
      );
    } else if (ruleDef.type === CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK) {
      details.push(
        ...checkDaysOffPerWeek(
          personId,
          weekOccurrences,
          weekDates,
          weekLabel,
          ruleDef.expectedCount
        )
      );
    }
  }

  return details;
}

export function detectInconsistencies({
  rules: scheduleRules,
  holidays = [],
  people = [],
  consistencyRules = [],
  shiftsById = {},
  monthKeys = [],
}) {
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));
  const results = [];

  for (const monthKey of monthKeys) {
    const { start, end } = getMonthRange(monthKey);
    const monthOccurrences = getRegularOccurrences(scheduleRules, start, end, holidays);
    const weeks = getWeeksOverlappingMonth(monthKey);

    for (const ruleDef of consistencyRules) {
      for (const personId of ruleDef.personIds || []) {
        if (!peopleById[personId]) continue;

        const details = checkRuleForPerson(
          ruleDef,
          personId,
          monthKey,
          monthOccurrences,
          weeks,
          scheduleRules,
          holidays,
          shiftsById
        );

        if (details.length === 0) continue;

        const { title } = describeConsistencyRule(ruleDef, shiftsById);

        results.push({
          id: `${ruleDef.id}__${personId}__${monthKey}`,
          ruleId: ruleDef.id,
          personId,
          message: `${peopleById[personId].nome} · ${title}`,
          details,
        });
      }
    }
  }

  return results.sort((a, b) => a.message.localeCompare(b.message, "pt-BR"));
}

export function formatMonthPeriodLabels(monthKeys = []) {
  return monthKeys.map((monthKey) => formatMonthPeriodLabel(monthKey)).join(" · ");
}

export function countConsistencyRuleLinks(consistencyRules = []) {
  return consistencyRules.reduce(
    (total, rule) => total + (rule.personIds?.length || 0),
    0
  );
}

export function countConsistencyRulesWithPeople(consistencyRules = []) {
  return consistencyRules.filter((rule) => (rule.personIds?.length || 0) > 0).length;
}
