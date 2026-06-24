import {
  parseISO,
  format,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { WEEKDAY_LABELS_FULL } from "./constants";

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

  const rangeStart = fromISODate(rangeStartISO);
  const rangeEnd = fromISODate(rangeEndISO);

  const cursorStart = rule.startDate
    ? (isAfter(fromISODate(rule.startDate), rangeStart) ? fromISODate(rule.startDate) : rangeStart)
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

/**
 * Gera ocorrências { personId, date, shift, ruleId } para todas as regras,
 * dentro do intervalo informado.
 */
export function getOccurrences(rules, rangeStartISO, rangeEndISO, holidays = []) {
  const normalizedHolidays = Array.isArray(holidays) ? holidays : [];
  const occurrences = [];
  for (const rule of rules) {
    const dates = expandRuleDates(rule, rangeStartISO, rangeEndISO, normalizedHolidays);
    for (const date of dates) {
      for (const shift of rule.shifts) {
        occurrences.push({
          id: `${rule.id}__${date}__${shift}`,
          ruleId: rule.id,
          personId: rule.personId,
          date,
          shift,
        });
      }
    }
  }
  return occurrences;
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
  if (rec.type === "weekly") {
    const days = (rec.weekdays || [])
      .slice()
      .sort((a, b) => a - b)
      .map((w) => weekdayLabels[w])
      .join(", ");
    return `Semanal · ${days || "—"}`;
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

/** Regra de dia específico no passado ou semanal com data de fim já ultrapassada. */
export function isRuleExpired(rule, todayISO = toISODate(new Date())) {
  const rec = rule.recurrence;

  if (rec.type === "specific_date") {
    return Boolean(rec.date && rec.date < todayISO);
  }

  if (rule.endDate) {
    return rule.endDate < todayISO;
  }

  return false;
}

export function partitionRulesByStatus(rules, todayISO = toISODate(new Date())) {
  const active = [];
  const expired = [];

  for (const rule of rules) {
    if (isRuleExpired(rule, todayISO)) {
      expired.push(rule);
    } else {
      active.push(rule);
    }
  }

  expired.sort((a, b) => {
    const dateA =
      a.recurrence.type === "specific_date" ? a.recurrence.date : a.endDate || "0000-01-01";
    const dateB =
      b.recurrence.type === "specific_date" ? b.recurrence.date : b.endDate || "0000-01-01";
    return dateB.localeCompare(dateA);
  });

  return { active, expired };
}
