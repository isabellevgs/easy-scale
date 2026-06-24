import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfWeek,
} from "date-fns";
import { fromISODate, toISODate } from "./schedule";

export const CUSTOM_FREQUENCIES = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
};

export const CUSTOM_MONTH_MODES = {
  DAY_OF_MONTH: "day_of_month",
  NTH_WEEKDAY: "nth_weekday",
};

export const CUSTOM_END_TYPES = {
  NEVER: "never",
  ON_DATE: "on_date",
  AFTER_COUNT: "after_count",
};

export const FREQUENCY_OPTIONS = [
  { id: CUSTOM_FREQUENCIES.DAY, labelSingular: "dia", labelPlural: "dias" },
  { id: CUSTOM_FREQUENCIES.WEEK, labelSingular: "semana", labelPlural: "semanas" },
  { id: CUSTOM_FREQUENCIES.MONTH, labelSingular: "mês", labelPlural: "meses" },
];

export function frequencyLabel(frequency, interval) {
  const option = FREQUENCY_OPTIONS.find((item) => item.id === frequency) || FREQUENCY_OPTIONS[0];
  return interval === 1 ? option.labelSingular : option.labelPlural;
}

const ORDINAL_LABELS = ["primeiro(a)", "segundo(a)", "terceiro(a)", "quarto(a)", "quinto(a)"];

function weekdayNameLower(label) {
  return label.toLowerCase();
}

function weekdayOrdinalInMonth(date) {
  const weekday = date.getDay();
  let count = 0;
  for (let day = 1; day <= date.getDate(); day += 1) {
    const probe = new Date(date.getFullYear(), date.getMonth(), day);
    if (probe.getDay() === weekday) count += 1;
  }
  return count;
}

function isLastWeekdayInMonth(date) {
  const next = addDays(date, 7);
  return next.getMonth() !== date.getMonth();
}

function ordinalLabelPt(date) {
  if (isLastWeekdayInMonth(date)) return "último(a)";
  const ordinal = weekdayOrdinalInMonth(date);
  return ORDINAL_LABELS[Math.min(ordinal, ORDINAL_LABELS.length) - 1] || ORDINAL_LABELS[0];
}

export function getMonthModeOptions(startDateISO, weekdayLabelsFull = []) {
  if (!startDateISO) return [];
  const date = parseISO(startDateISO);
  const day = date.getDate();
  const weekdayLabel = weekdayLabelsFull[date.getDay()] || "dia";

  return [
    {
      id: CUSTOM_MONTH_MODES.DAY_OF_MONTH,
      label: `Mensal no dia ${day}`,
    },
    {
      id: CUSTOM_MONTH_MODES.NTH_WEEKDAY,
      label: `Mensal no(a) ${ordinalLabelPt(date)} ${weekdayNameLower(weekdayLabel)}`,
    },
  ];
}

function matchesNthWeekdayInMonth(date, anchor) {
  if (date.getDay() !== anchor.getDay()) return false;
  if (isLastWeekdayInMonth(anchor)) return isLastWeekdayInMonth(date);
  return weekdayOrdinalInMonth(date) === weekdayOrdinalInMonth(anchor);
}

export function emptyCustomRecurrence(startDateISO) {
  const weekday = new Date(`${startDateISO}T00:00:00`).getDay();
  return {
    type: "custom",
    interval: 1,
    frequency: CUSTOM_FREQUENCIES.DAY,
    weekdays: [weekday],
    endType: CUSTOM_END_TYPES.NEVER,
    endDate: "",
    occurrenceCount: 30,
    monthMode: CUSTOM_MONTH_MODES.DAY_OF_MONTH,
  };
}

export function normalizeCustomRecurrence(rec, startDateISO) {
  const anchor = startDateISO || toISODate(new Date());
  const anchorWeekday = new Date(`${anchor}T00:00:00`).getDay();
  const validFrequencies = FREQUENCY_OPTIONS.map((item) => item.id);
  const rawFrequency = rec?.frequency === "year" ? CUSTOM_FREQUENCIES.MONTH : rec?.frequency;
  const frequency = validFrequencies.includes(rawFrequency)
    ? rawFrequency
    : CUSTOM_FREQUENCIES.DAY;
  const interval = Math.max(1, Math.min(999, Number(rec?.interval) || 1));
  const validEndTypes = Object.values(CUSTOM_END_TYPES);
  const endType = validEndTypes.includes(rec?.endType) ? rec.endType : CUSTOM_END_TYPES.NEVER;
  const validMonthModes = Object.values(CUSTOM_MONTH_MODES);
  const monthMode = validMonthModes.includes(rec?.monthMode)
    ? rec.monthMode
    : CUSTOM_MONTH_MODES.DAY_OF_MONTH;
  const weekdays = Array.isArray(rec?.weekdays)
    ? [...new Set(rec.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : [];
  const normalizedWeekdays =
    frequency === CUSTOM_FREQUENCIES.WEEK && weekdays.length === 0 ? [anchorWeekday] : weekdays;

  return {
    type: "custom",
    interval,
    frequency,
    weekdays: normalizedWeekdays,
    monthMode,
    endType,
    endDate: typeof rec?.endDate === "string" ? rec.endDate : "",
    occurrenceCount: Math.max(1, Math.min(999, Number(rec?.occurrenceCount) || 30)),
  };
}

export function isValidCustomRecurrence(rec, startDateISO) {
  if (!startDateISO) return false;
  const normalized = normalizeCustomRecurrence(rec, startDateISO);
  if (normalized.frequency === CUSTOM_FREQUENCIES.WEEK && normalized.weekdays.length === 0) {
    return false;
  }
  if (normalized.endType === CUSTOM_END_TYPES.ON_DATE) {
    if (!normalized.endDate) return false;
    if (normalized.endDate < startDateISO) return false;
  }
  return true;
}

function matchesCustomDate(iso, anchorISO, rec) {
  const date = fromISODate(iso);
  const anchor = fromISODate(anchorISO);
  if (isBefore(date, anchor)) return false;

  if (rec.frequency === CUSTOM_FREQUENCIES.DAY) {
    return differenceInCalendarDays(date, anchor) % rec.interval === 0;
  }

  if (rec.frequency === CUSTOM_FREQUENCIES.WEEK) {
    const weekdays = rec.weekdays.length ? rec.weekdays : [anchor.getDay()];
    if (!weekdays.includes(date.getDay())) return false;
    const anchorWeekStart = startOfWeek(anchor, { weekStartsOn: 0 });
    const dateWeekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weeksDiff = differenceInCalendarWeeks(dateWeekStart, anchorWeekStart, {
      weekStartsOn: 0,
    });
    return weeksDiff % rec.interval === 0;
  }

  if (rec.frequency === CUSTOM_FREQUENCIES.MONTH) {
    const monthsDiff = differenceInCalendarMonths(date, anchor);
    if (monthsDiff < 0 || monthsDiff % rec.interval !== 0) return false;
    if (rec.monthMode === CUSTOM_MONTH_MODES.NTH_WEEKDAY) {
      return matchesNthWeekdayInMonth(date, anchor);
    }
    return date.getDate() === anchor.getDate();
  }

  if (rec.frequency === "year") {
    if (date.getMonth() !== anchor.getMonth() || date.getDate() !== anchor.getDate()) {
      return false;
    }
    const yearsDiff = date.getFullYear() - anchor.getFullYear();
    return yearsDiff >= 0 && yearsDiff % rec.interval === 0;
  }

  return false;
}

function resolveEffectiveEnd(rec, rangeEndISO) {
  if (rec.endType === CUSTOM_END_TYPES.ON_DATE && rec.endDate) {
    return rec.endDate < rangeEndISO ? rec.endDate : rangeEndISO;
  }
  return rangeEndISO;
}

export function expandCustomRuleDates(rule, rangeStartISO, rangeEndISO) {
  const anchor = rule.startDate;
  if (!anchor) return [];

  const rec = normalizeCustomRecurrence(rule.recurrence, anchor);
  const effectiveEnd = resolveEffectiveEnd(rec, rangeEndISO);
  const maxCount =
    rec.endType === CUSTOM_END_TYPES.AFTER_COUNT ? rec.occurrenceCount : Number.POSITIVE_INFINITY;

  const dates = [];
  let occurrenceIndex = 0;
  let cur = fromISODate(anchor);
  const rangeStart = fromISODate(rangeStartISO);
  const rangeEnd = fromISODate(effectiveEnd);
  const safetyLimit = 366 * 30;
  let steps = 0;

  while (!isAfter(cur, rangeEnd) && occurrenceIndex < maxCount && steps < safetyLimit) {
    const iso = toISODate(cur);
    if (matchesCustomDate(iso, anchor, rec)) {
      occurrenceIndex += 1;
      if (occurrenceIndex > maxCount) break;
      if (!isBefore(cur, rangeStart)) {
        dates.push(iso);
      }
    }
    cur = addDays(cur, 1);
    steps += 1;
  }

  return dates;
}

export function getLastCustomOccurrenceDate(rule) {
  const anchor = rule.startDate;
  if (!anchor) return null;

  const rec = normalizeCustomRecurrence(rule.recurrence, anchor);
  if (rec.endType === CUSTOM_END_TYPES.ON_DATE && rec.endDate) {
    return rec.endDate;
  }

  if (rec.endType === CUSTOM_END_TYPES.AFTER_COUNT) {
    const farEnd = format(addDays(parseISO(anchor), 366 * 30), "yyyy-MM-dd");
    const dates = expandCustomRuleDates(rule, anchor, farEnd);
    return dates.length ? dates[dates.length - 1] : null;
  }

  return null;
}

export function describeCustomRecurrence(rec, startDateISO, weekdayLabels) {
  const normalized = normalizeCustomRecurrence(rec, startDateISO);
  const unit = frequencyLabel(normalized.frequency, normalized.interval);
  let summary = `A cada ${normalized.interval} ${unit}`;

  if (normalized.frequency === CUSTOM_FREQUENCIES.WEEK) {
    const days = normalized.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((day) => weekdayLabels[day])
      .join(", ");
    summary += ` · ${days}`;
  }

  if (normalized.frequency === CUSTOM_FREQUENCIES.MONTH) {
    const monthOptions = getMonthModeOptions(startDateISO, weekdayLabels);
    const monthLabel = monthOptions.find((item) => item.id === normalized.monthMode)?.label;
    if (monthLabel) summary += ` · ${monthLabel}`;
  }

  if (normalized.endType === CUSTOM_END_TYPES.NEVER) {
    summary += " · sem término";
  } else if (normalized.endType === CUSTOM_END_TYPES.ON_DATE && normalized.endDate) {
    summary += ` · até ${format(parseISO(normalized.endDate), "dd/MM/yyyy")}`;
  } else if (normalized.endType === CUSTOM_END_TYPES.AFTER_COUNT) {
    summary += ` · após ${normalized.occurrenceCount} ocorrências`;
  }

  if (startDateISO) {
    summary += ` · início ${format(parseISO(startDateISO), "dd/MM/yyyy")}`;
  }

  return summary;
}
