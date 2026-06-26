import { WEEKDAY_LABELS } from "./constants";

/** @deprecated Use weekdays + appliesOnHolidays. Mantido para migração. */
export const SHIFT_SCOPES = {
  weekday: { id: "weekday", label: "Segunda a sexta" },
  weekend: { id: "weekend", label: "Sábado, domingo e feriados" },
};

export const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5];
export const DEFAULT_WEEKEND_DAYS = [0, 6];

export const DEFAULT_SHIFTS = [
  {
    id: "turno_1",
    label: "Turno 1",
    start: "08:00",
    end: "18:00",
    weekdays: DEFAULT_WEEKDAYS,
    appliesOnHolidays: false,
  },
];

/** @deprecated Mantido para migração de dados antigos. */
export const DEFAULT_SHIFT_TIMES = Object.fromEntries(
  DEFAULT_SHIFTS.map((shift) => [shift.id, { start: shift.start, end: shift.end }])
);

/** @deprecated Use shifts.map(s => s.id) em vez disso. */
export const SHIFT_IDS = DEFAULT_SHIFTS.map((shift) => shift.id);

const SHIFT_PALETTE = [
  { color: "var(--color-shift-morning)", soft: "var(--color-shift-morning-soft)" },
  { color: "var(--color-shift-afternoon)", soft: "var(--color-shift-afternoon-soft)" },
  { color: "var(--color-shift-night)", soft: "var(--color-shift-night-soft)" },
  {
    color: "var(--color-shift-weekend-morning)",
    soft: "var(--color-shift-weekend-morning-soft)",
  },
  { color: "var(--color-shift-weekend-night)", soft: "var(--color-shift-weekend-night-soft)" },
  { color: "var(--color-brand)", soft: "var(--color-brand-soft)" },
  { color: "#f97316", soft: "#f9731620" },
  { color: "#818cf8", soft: "#818cf820" },
];

const DEFAULT_VISUAL_INDEX = {
  turno_1: 0,
};

function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function scopeToWeekdayConfig(scope) {
  if (scope === "weekend") {
    return { weekdays: [...DEFAULT_WEEKEND_DAYS], appliesOnHolidays: true };
  }
  return { weekdays: [...DEFAULT_WEEKDAYS], appliesOnHolidays: false };
}

export function normalizeShiftWeekdays(rawWeekdays, fallbackWeekdays = DEFAULT_WEEKDAYS) {
  if (!Array.isArray(rawWeekdays)) return [...fallbackWeekdays];

  const normalized = [...new Set(rawWeekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  normalized.sort((a, b) => a - b);
  return normalized.length > 0 ? normalized : [...fallbackWeekdays];
}

function resolveShiftWeekdayConfig(raw, defaults) {
  if (Array.isArray(raw?.weekdays)) {
    return {
      weekdays: normalizeShiftWeekdays(raw.weekdays, defaults.weekdays),
      appliesOnHolidays: Boolean(raw.appliesOnHolidays),
    };
  }

  if (raw?.scope === "weekday" || raw?.scope === "weekend") {
    return scopeToWeekdayConfig(raw.scope);
  }

  if (defaults.weekdays || defaults.scope) {
    return defaults.weekdays
      ? {
          weekdays: normalizeShiftWeekdays(defaults.weekdays),
          appliesOnHolidays: Boolean(defaults.appliesOnHolidays),
        }
      : scopeToWeekdayConfig(defaults.scope);
  }

  return { weekdays: [...DEFAULT_WEEKDAYS], appliesOnHolidays: false };
}

function generateShort(label) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
  }
  return label.trim().slice(0, 3).toUpperCase() || "?";
}

export function formatShiftTime({ start, end }) {
  return `${start}–${end}`;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function formatShiftWeekdaysLabel(shift) {
  const weekdays = normalizeShiftWeekdays(shift?.weekdays, []);
  const parts = [];

  if (weekdays.length === 5 && arraysEqual(weekdays, DEFAULT_WEEKDAYS)) {
    parts.push("Seg–Sex");
  } else if (weekdays.length === 2 && arraysEqual(weekdays, DEFAULT_WEEKEND_DAYS)) {
    parts.push("Sáb e Dom");
  } else if (weekdays.length > 0) {
    parts.push(weekdays.map((day) => WEEKDAY_LABELS[day]).join(", "));
  }

  if (shift?.appliesOnHolidays) parts.push("Feriados");

  return parts.join(" · ") || "—";
}

export function shiftsShareApplicableDay(shiftA, shiftB) {
  if (!shiftA || !shiftB) return false;
  if (shiftA.appliesOnHolidays && shiftB.appliesOnHolidays) return true;

  const daysA = normalizeShiftWeekdays(shiftA.weekdays, []);
  const daysB = normalizeShiftWeekdays(shiftB.weekdays, []);
  return daysA.some((day) => daysB.includes(day));
}

export function shiftAppliesOnNeedDay(shift, dayIndex, feriadoDayIndex = 7) {
  if (!shift) return false;
  if (dayIndex === feriadoDayIndex) return Boolean(shift.appliesOnHolidays);
  return normalizeShiftWeekdays(shift.weekdays, []).includes(dayIndex);
}

export function shiftAppliesOnDate(shift, dateISO, holidays = [], feriadoDayIndex = 7) {
  if (!shift || typeof dateISO !== "string") return false;
  if (holidays.includes(dateISO)) return Boolean(shift.appliesOnHolidays);
  const dayIndex = new Date(`${dateISO}T00:00:00`).getDay();
  return shiftAppliesOnNeedDay(shift, dayIndex, feriadoDayIndex);
}

function normalizeShiftItem(raw, fallbackIndex = 0) {
  const defaults = DEFAULT_SHIFTS[fallbackIndex] ?? DEFAULT_SHIFTS[0];
  const id =
    typeof raw?.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `shift_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const label =
    typeof raw?.label === "string" && raw.label.trim() ? raw.label.trim() : defaults.label;
  const start = isValidTime(raw?.start) ? raw.start : defaults.start;
  const end = isValidTime(raw?.end) ? raw.end : defaults.end;
  const { weekdays, appliesOnHolidays } = resolveShiftWeekdayConfig(raw, defaults);

  return { id, label, start, end, weekdays, appliesOnHolidays };
}

export function normalizeShifts(rawShifts, legacyShiftTimes) {
  if (Array.isArray(rawShifts) && rawShifts.length > 0) {
    const seen = new Set();
    const result = [];

    for (let index = 0; index < rawShifts.length; index += 1) {
      const item = normalizeShiftItem(rawShifts[index], index);
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }

    return result.length > 0 ? result : structuredClone(DEFAULT_SHIFTS);
  }

  if (legacyShiftTimes && typeof legacyShiftTimes === "object") {
    return DEFAULT_SHIFTS.map((defaults) => {
      const legacy = legacyShiftTimes[defaults.id];
      return normalizeShiftItem(
        {
          ...defaults,
          start: legacy?.start,
          end: legacy?.end,
        },
        0
      );
    });
  }

  return structuredClone(DEFAULT_SHIFTS);
}

/** @deprecated Use normalizeShifts. */
export function normalizeShiftTimes(raw) {
  return Object.fromEntries(
    normalizeShifts(null, raw).map((shift) => [shift.id, { start: shift.start, end: shift.end }])
  );
}

function enrichShift(shift, index) {
  const paletteIndex = DEFAULT_VISUAL_INDEX[shift.id] ?? index % SHIFT_PALETTE.length;
  const visual = SHIFT_PALETTE[paletteIndex];
  const weekdaysLabel = formatShiftWeekdaysLabel(shift);

  return {
    ...shift,
    ...visual,
    short: generateShort(shift.label),
    time: formatShiftTime(shift),
    weekdaysLabel,
    scopeLabel: weekdaysLabel,
  };
}

export function buildShifts(shiftsConfig = DEFAULT_SHIFTS) {
  const normalized = normalizeShifts(shiftsConfig);
  return normalized.map((shift, index) => enrichShift(shift, index));
}

export function buildShiftsById(shiftsConfig = DEFAULT_SHIFTS) {
  return Object.fromEntries(buildShifts(shiftsConfig).map((shift) => [shift.id, shift]));
}

export function getShiftIds(shiftsConfig = DEFAULT_SHIFTS) {
  return normalizeShifts(shiftsConfig).map((shift) => shift.id);
}

/** Ordem de exibição conforme a lista de turnos cadastrada. */
export function sortShiftIds(shiftIds, shiftsConfig = DEFAULT_SHIFTS) {
  if (!Array.isArray(shiftIds)) return [];
  const order = getShiftIds(shiftsConfig);
  return order.filter((id) => shiftIds.includes(id));
}

function shiftWeekdayConfigMatches(defaults, current) {
  return (
    arraysEqual(normalizeShiftWeekdays(current.weekdays, []), normalizeShiftWeekdays(defaults.weekdays, [])) &&
    Boolean(current.appliesOnHolidays) === Boolean(defaults.appliesOnHolidays)
  );
}

export function isDefaultShifts(shifts) {
  const normalized = normalizeShifts(shifts);
  if (normalized.length !== DEFAULT_SHIFTS.length) return false;

  return DEFAULT_SHIFTS.every((defaults, index) => {
    const current = normalized[index];
    return (
      current.id === defaults.id &&
      current.label === defaults.label &&
      current.start === defaults.start &&
      current.end === defaults.end &&
      shiftWeekdayConfigMatches(defaults, current)
    );
  });
}

export function createEmptyShift() {
  return {
    id: "",
    label: "",
    start: "08:00",
    end: "16:00",
    weekdays: [],
    appliesOnHolidays: false,
  };
}

export function countRulesUsingShift(rules, shiftId) {
  if (!Array.isArray(rules)) return 0;
  return rules.filter((rule) => Array.isArray(rule.shifts) && rule.shifts.includes(shiftId)).length;
}

export function validateShiftWeekdayConfig(weekdays, appliesOnHolidays) {
  const normalized = normalizeShiftWeekdays(weekdays, []);
  if (normalized.length === 0 && !appliesOnHolidays) {
    return { ok: false, error: "Selecione ao menos um dia da semana ou feriados." };
  }
  return { ok: true, weekdays: normalized, appliesOnHolidays: Boolean(appliesOnHolidays) };
}
