import {
  parseISO,
  format,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { WEEKDAY_LABELS_FULL } from "./constants";
import { normalizeScaleType, SCALE_TYPES, describeScaleType } from "./rules";
import {
  describeCustomRecurrence,
  expandCustomRuleDates,
  getLastCustomOccurrenceDate,
} from "./customRecurrence";

export { SCALE_TYPES, normalizeScaleType } from "./rules";

// ---- Helpers de data (strings ISO 'yyyy-MM-dd' são a fonte da verdade) ----

export function toISODate(date) {
  return format(date, "yyyy-MM-dd");
}

export function fromISODate(iso) {
  return startOfDay(parseISO(iso));
}

/** Ex.: "Quarta · 24/06/2026" */
export function formatShiftDateLabel(date) {
  const weekday = WEEKDAY_LABELS_FULL[date.getDay()].split("-")[0];
  return `${weekday} · ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;
}

function inRange(dateISO, startISO, endISO) {
  const d = fromISODate(dateISO);
  if (startISO && isBefore(d, fromISODate(startISO))) return false;
  if (endISO && isAfter(d, fromISODate(endISO))) return false;
  return true;
}

/**
 * Expande uma única regra de escala em todas as datas (ISO) em que ela
 * se aplica, dentro do intervalo [rangeStartISO, rangeEndISO].
 */
function expandRuleDates(rule, rangeStartISO, rangeEndISO, holidays = []) {
  const dates = [];
  const rec = rule.recurrence;

  if (rec.type === "specific_date") {
    // Dia específico ignora startDate/endDate da regra (campos ocultos no cadastro).
    if (rec.date && inRange(rec.date, rangeStartISO, rangeEndISO)) {
      dates.push(rec.date);
    }
    return dates;
  }

  if (rec.type === "specific_dates") {
    for (const date of (rec.dates || []).slice().sort()) {
      if (date && inRange(date, rangeStartISO, rangeEndISO)) {
        dates.push(date);
      }
    }
    return dates;
  }

  if (rec.type === "custom") {
    return expandCustomRuleDates(rule, rangeStartISO, rangeEndISO);
  }

  const rangeStart = fromISODate(rangeStartISO);
  const rangeEnd = fromISODate(rangeEndISO);

  const cursorStart = rule.startDate
    ? isAfter(fromISODate(rule.startDate), rangeStart)
      ? fromISODate(rule.startDate)
      : rangeStart
    : rangeStart;
  const cursorEnd = rule.endDate
    ? (isBefore(fromISODate(rule.endDate), rangeEnd) ? fromISODate(rule.endDate) : rangeEnd)
    : rangeEnd;

  if (isAfter(cursorStart, cursorEnd)) return dates;

  // Para os demais tipos, iteramos dia a dia no intervalo efetivo
  let cur = new Date(cursorStart);
  while (!isAfter(cur, cursorEnd)) {
    const iso = toISODate(cur);
    const weekday = cur.getDay(); // 0=dom...6=sab
    const dayOfMonth = cur.getDate();
    const monthKey = format(cur, "yyyy-MM");

    let matches = false;
    if (rec.type === "weekly") {
      matches = (rec.weekdays || []).includes(weekday) && !holidays.includes(iso);
    } else if (rec.type === "monthly") {
      matches = Number(rec.dayOfMonth) === dayOfMonth;
    } else if (rec.type === "specific_months") {
      const monthsMatch = (rec.months || []).includes(monthKey);
      if (monthsMatch) {
        // Se dayOfMonth definido, restringe a esse dia; senão, todo dia do mês
        matches = rec.dayOfMonth ? Number(rec.dayOfMonth) === dayOfMonth : true;
      }
    }

    if (matches) dates.push(iso);
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }

  return dates;
}

export function isRegularOccurrence(occ) {
  return normalizeScaleType(occ?.scaleType) === SCALE_TYPES.REGULAR;
}

/** Regular e hora extra (ou tipos distintos) no mesmo turno e dia. */
export function personHasOverlappingScalesOnShift(shiftOccurrences, personId) {
  const matches = (shiftOccurrences || []).filter((occ) => occ.personId === personId);
  if (matches.length <= 1) return false;
  const scaleTypes = new Set(matches.map((occ) => normalizeScaleType(occ.scaleType)));
  return scaleTypes.size > 1;
}

const SCALE_TYPE_ORDER = {
  [SCALE_TYPES.REGULAR]: 0,
  [SCALE_TYPES.OVERTIME]: 1,
};

/** Rótulos das escalas distintas da pessoa no turno (ex.: ["Regular", "Hora extra"]). */
export function getPersonOverlappingScaleLabels(shiftOccurrences, personId) {
  const matches = (shiftOccurrences || []).filter((occ) => occ.personId === personId);
  if (matches.length <= 1) return [];

  const scaleTypes = [...new Set(matches.map((occ) => normalizeScaleType(occ.scaleType)))];
  if (scaleTypes.length <= 1) return [];

  scaleTypes.sort((a, b) => SCALE_TYPE_ORDER[a] - SCALE_TYPE_ORDER[b]);
  return scaleTypes.map(describeScaleType);
}

/** Texto para tooltip — ex.: "Regular e Hora extra". */
export function describePersonScaleOverlap(shiftOccurrences, personId) {
  const labels = getPersonOverlappingScaleLabels(shiftOccurrences, personId);
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

/**
 * Gera ocorrências { personId, date, shift, ruleId, scaleType } para todas as regras,
 * dentro do intervalo informado.
 */
export function getOccurrences(rules, rangeStartISO, rangeEndISO, holidays = []) {
  const normalizedHolidays = Array.isArray(holidays) ? holidays : [];
  const occurrences = [];
  for (const rule of rules) {
    const scaleType = normalizeScaleType(rule.scaleType);
    const dates = expandRuleDates(rule, rangeStartISO, rangeEndISO, normalizedHolidays);
    for (const date of dates) {
      for (const shift of rule.shifts) {
        occurrences.push({
          id: `${rule.id}__${date}__${shift}`,
          ruleId: rule.id,
          personId: rule.personId,
          date,
          shift,
          scaleType,
        });
      }
    }
  }
  return occurrences;
}

/** Ocorrências regulares — usadas nas regras de inconsistência. */
export function getRegularOccurrences(rules, rangeStartISO, rangeEndISO, holidays = []) {
  return getOccurrences(rules, rangeStartISO, rangeEndISO, holidays).filter(isRegularOccurrence);
}

/** Mantém ocorrências das pessoas informadas (array vazio = sem filtro). */
export function filterOccurrencesByPerson(occurrences, personIds) {
  if (!personIds?.length) return occurrences;
  const allowed = new Set(personIds);
  return occurrences.filter((occ) => allowed.has(occ.personId));
}

/** Agrupa ocorrências por data ISO -> array de ocorrências */
export function groupByDate(occurrences) {
  const map = {};
  for (const occ of occurrences) {
    if (!map[occ.date]) map[occ.date] = [];
    map[occ.date].push(occ);
  }
  return map;
}

/** Agrupa ocorrências por personId -> array de ocorrências */
export function groupByPerson(occurrences) {
  const map = {};
  for (const occ of occurrences) {
    if (!map[occ.personId]) map[occ.personId] = [];
    map[occ.personId].push(occ);
  }
  return map;
}

export function describeRecurrence(rule, weekdayLabels, monthLabels) {
  const rec = rule.recurrence;
  if (rec.type === "specific_date") {
    return `Dia único · ${format(fromISODate(rec.date), "dd/MM/yyyy")}`;
  }
  if (rec.type === "specific_dates") {
    const dates = (rec.dates || []).slice().sort();
    if (dates.length === 0) return "Selecionar dias · —";
    if (dates.length === 1) {
      return `Selecionar dias · ${format(fromISODate(dates[0]), "dd/MM/yyyy")}`;
    }
    if (dates.length <= 3) {
      const labels = dates.map((d) => format(fromISODate(d), "dd/MM/yyyy")).join(", ");
      return `Selecionar dias · ${labels}`;
    }
    const first = format(fromISODate(dates[0]), "dd/MM/yyyy");
    const last = format(fromISODate(dates[dates.length - 1]), "dd/MM/yyyy");
    return `Selecionar dias · ${dates.length} dias (${first} – ${last})`;
  }
  if (rec.type === "weekly") {
    const days = (rec.weekdays || [])
      .slice()
      .sort((a, b) => a - b)
      .map((w) => weekdayLabels[w])
      .join(", ");
    return `Semanal · ${days || "—"}`;
  }
  if (rec.type === "custom") {
    return `Personalizada · ${describeCustomRecurrence(rec, rule.startDate, weekdayLabels)}`;
  }
  if (rec.type === "monthly") {
    return `Mensal · todo dia ${rec.dayOfMonth}`;
  }
  if (rec.type === "specific_months") {
    const months = (rec.months || [])
      .map((m) => {
        const [y, mo] = m.split("-");
        return `${monthLabels[Number(mo) - 1].slice(0, 3)}/${y}`;
      })
      .join(", ");
    const dayPart = rec.dayOfMonth ? ` · dia ${rec.dayOfMonth}` : " · todos os dias";
    return `Meses específicos · ${months}${dayPart}`;
  }
  return "";
}

/** Regra de dia específico no passado ou com data de fim já ultrapassada. */
export function isRuleExpired(rule, todayISO = toISODate(new Date())) {
  const rec = rule.recurrence;

  if (rec.type === "specific_date") {
    return Boolean(rec.date && rec.date < todayISO);
  }

  if (rec.type === "specific_dates") {
    const dates = rec.dates || [];
    if (dates.length === 0) return true;
    return dates.every((d) => d < todayISO);
  }

  if (rec.type === "custom") {
    const normalized = rec;
    if (normalized.endType === "on_date" && normalized.endDate) {
      return normalized.endDate < todayISO;
    }
    if (normalized.endType === "after_count") {
      const lastDate = getLastCustomOccurrenceDate(rule);
      return Boolean(lastDate && lastDate < todayISO);
    }
    return false;
  }

  if (rule.endDate) {
    return rule.endDate < todayISO;
  }

  return false;
}

function ruleStartDateISO(rule) {
  const rec = rule.recurrence;

  if (rec.type === "specific_date") {
    return rec.date || "";
  }

  if (rec.type === "specific_dates") {
    const dates = (rec.dates || []).slice().sort();
    return dates[0] || "";
  }

  return rule.startDate || "";
}

/** Regra com início no futuro e ainda não expirada. */
export function isRuleScheduled(rule, todayISO = toISODate(new Date())) {
  if (isRuleExpired(rule, todayISO)) return false;

  const rec = rule.recurrence;

  if (rec.type === "specific_date") {
    return Boolean(rec.date && rec.date > todayISO);
  }

  if (rec.type === "specific_dates") {
    const dates = rec.dates || [];
    if (dates.length === 0) return false;
    return dates.every((date) => date > todayISO);
  }

  const startDate = ruleStartDateISO(rule);
  return Boolean(startDate && startDate > todayISO);
}

export function partitionRulesByStatus(rules, todayISO = toISODate(new Date())) {
  const active = [];
  const scheduled = [];
  const expired = [];

  for (const rule of rules) {
    if (isRuleExpired(rule, todayISO)) {
      expired.push(rule);
    } else if (isRuleScheduled(rule, todayISO)) {
      scheduled.push(rule);
    } else {
      active.push(rule);
    }
  }

  function ruleExpiredSortDate(rule) {
    const rec = rule.recurrence;
    if (rec.type === "specific_date") return rec.date || "0000-01-01";
    if (rec.type === "specific_dates") {
      const dates = rec.dates || [];
      return dates.length ? [...dates].sort().pop() : "0000-01-01";
    }
    if (rec.type === "custom") {
      return getLastCustomOccurrenceDate(rule) || rule.endDate || "0000-01-01";
    }
    return rule.endDate || "0000-01-01";
  }

  expired.sort((a, b) => ruleExpiredSortDate(b).localeCompare(ruleExpiredSortDate(a)));
  scheduled.sort((a, b) => ruleStartDateISO(a).localeCompare(ruleStartDateISO(b)));

  return { active, scheduled, expired };
}
