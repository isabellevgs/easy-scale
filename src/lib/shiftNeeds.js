import { getShiftIds, normalizeShifts } from "./shifts";

/** Índices 0–6 = dom–sáb; 7 = template de feriado. */
export const FERIADO_DAY_INDEX = 7;
export const NEED_DAY_COUNT = 8;

/** Ordem de exibição na tabela de necessidade: seg–sáb–dom–feriado. */
export const NEED_DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0, FERIADO_DAY_INDEX];

export const WEEKEND_DAYS = new Set([0, 6]);

function isWeekdayRow(dayIndex) {
  return dayIndex >= 1 && dayIndex <= 5;
}

function isWeekendOrFeriadoRow(dayIndex) {
  return dayIndex === FERIADO_DAY_INDEX || WEEKEND_DAYS.has(dayIndex);
}

function getShiftScope(shiftId, shiftsById) {
  return shiftsById?.[shiftId]?.scope ?? null;
}

export function isShiftNeedEditable(dayIndex, shiftId, shiftsById = {}) {
  const scope = getShiftScope(shiftId, shiftsById);
  if (scope === "weekday") return isWeekdayRow(dayIndex);
  if (scope === "weekend") return isWeekendOrFeriadoRow(dayIndex);
  return true;
}

export function getApplicableShiftIdsForDate(dateISO, shiftIds, holidays = [], shiftsById = {}) {
  const dayIndex = resolveNeedDayIndex(dateISO, holidays);
  return shiftIds.filter((shiftId) => isShiftNeedEditable(dayIndex, shiftId, shiftsById));
}

export function shiftNeedDisabledReason(dayIndex, shiftId, shiftsById = {}) {
  if (isShiftNeedEditable(dayIndex, shiftId, shiftsById)) return "";
  const scope = getShiftScope(shiftId, shiftsById);
  if (scope === "weekday") {
    return "Turnos de segunda a sexta só têm meta nesses dias";
  }
  return "Turnos de fim de semana/feriado só têm meta nesses dias e na linha Feriado";
}

export function normalizeHolidays(raw) {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((item) => typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item));
  return [...new Set(valid)].sort();
}

export function resolveNeedDayIndex(dateISO, holidays = []) {
  if (holidays.includes(dateISO)) return FERIADO_DAY_INDEX;
  return new Date(`${dateISO}T00:00:00`).getDay();
}

export function createEmptyDayNeeds(shiftIds) {
  const ids = Array.isArray(shiftIds) ? shiftIds : getShiftIds();
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

export function normalizeShiftNeeds(raw, shiftsConfig) {
  const normalizedShifts = normalizeShifts(shiftsConfig);
  const shiftsById = Object.fromEntries(normalizedShifts.map((shift) => [shift.id, shift]));
  const ids = normalizedShifts.map((shift) => shift.id);
  const result = Array.from({ length: NEED_DAY_COUNT }, () => createEmptyDayNeeds(ids));
  if (!raw) return result;

  for (let day = 0; day < NEED_DAY_COUNT; day += 1) {
    const dayRaw = Array.isArray(raw) ? raw[day] : raw[day] ?? raw[String(day)];
    if (!dayRaw || typeof dayRaw !== "object") continue;

    for (const id of ids) {
      if (!isShiftNeedEditable(day, id, shiftsById)) {
        result[day][id] = 0;
        continue;
      }

      const value = Number(dayRaw[id]);
      if (Number.isInteger(value) && value >= 0 && value <= 99) {
        result[day][id] = value;
      }
    }
  }

  return result;
}

export function normalizeShiftNeedsForShifts(raw, shiftsConfig) {
  return normalizeShiftNeeds(raw, shiftsConfig);
}

export function getShiftNeed(shiftNeeds, dayIndex, shiftId, shiftsById = {}) {
  if (!isShiftNeedEditable(dayIndex, shiftId, shiftsById)) return 0;
  const day = shiftNeeds?.[dayIndex];
  if (!day) return 0;
  const value = day[shiftId];
  return typeof value === "number" && value >= 0 ? value : 0;
}

export function getShiftNeedForDate(shiftNeeds, dateISO, shiftId, holidays = [], shiftsById = {}) {
  const dayIndex = resolveNeedDayIndex(dateISO, holidays);
  return getShiftNeed(shiftNeeds, dayIndex, shiftId, shiftsById);
}

export function isDefaultShiftNeeds(shiftNeeds, shiftsConfig) {
  const ids = getShiftIds(shiftsConfig);
  const normalized = normalizeShiftNeedsForShifts(shiftNeeds, shiftsConfig);
  return normalized.every((day) => ids.every((id) => day[id] === 0));
}

export const STAFFING_STATUS = {
  NONE: "none",
  OK: "ok",
  SHORT: "short",
  OVER: "over",
};

export function getStaffingStatus(required, scheduled) {
  if (required <= 0) return STAFFING_STATUS.NONE;
  if (scheduled < required) return STAFFING_STATUS.SHORT;
  if (scheduled > required) return STAFFING_STATUS.OVER;
  return STAFFING_STATUS.OK;
}

export function getShiftStaffing(dayOccurrences, shiftId, shiftNeeds, dayIndex, shiftsById = {}) {
  const required = getShiftNeed(shiftNeeds, dayIndex, shiftId, shiftsById);
  const scheduled = dayOccurrences.filter((occ) => occ.shift === shiftId).length;
  const status = getStaffingStatus(required, scheduled);

  return { required, scheduled, status };
}

export function getDayStaffingRows(
  dayOccurrences,
  shiftNeeds,
  dateISO,
  shiftIds,
  holidays = [],
  shiftsById = {}
) {
  const dayIndex = resolveNeedDayIndex(dateISO, holidays);
  return shiftIds
    .map((shiftId) => ({
      shiftId,
      ...getShiftStaffing(dayOccurrences, shiftId, shiftNeeds, dayIndex, shiftsById),
    }))
    .filter((row) => row.required > 0 || row.scheduled > 0);
}

export function getDayWorstStaffingStatus(rows) {
  if (rows.some((row) => row.status === STAFFING_STATUS.SHORT)) return STAFFING_STATUS.SHORT;
  if (rows.some((row) => row.status === STAFFING_STATUS.OVER)) return STAFFING_STATUS.OVER;
  if (rows.some((row) => row.status === STAFFING_STATUS.OK)) return STAFFING_STATUS.OK;
  return STAFFING_STATUS.NONE;
}

export function staffingStatusStyles(status) {
  switch (status) {
    case STAFFING_STATUS.OK:
      return {
        bg: "color-mix(in srgb, var(--color-good) 16%, transparent)",
        border: "color-mix(in srgb, var(--color-good) 42%, transparent)",
        text: "var(--color-good)",
      };
    case STAFFING_STATUS.SHORT:
      return {
        bg: "color-mix(in srgb, var(--color-bad) 16%, transparent)",
        border: "color-mix(in srgb, var(--color-bad) 42%, transparent)",
        text: "var(--color-bad)",
      };
    case STAFFING_STATUS.OVER:
      return {
        bg: "color-mix(in srgb, var(--color-over) 16%, transparent)",
        border: "color-mix(in srgb, var(--color-over) 42%, transparent)",
        text: "var(--color-over)",
      };
    default:
      return {
        bg: "var(--color-surface-2)",
        border: "var(--color-border-soft)",
        text: "var(--color-ink-soft)",
      };
  }
}

export function staffingCellBackground(status) {
  if (status === STAFFING_STATUS.NONE) return null;

  switch (status) {
    case STAFFING_STATUS.OK:
      return "color-mix(in srgb, var(--color-good) 42%, var(--color-surface))";
    case STAFFING_STATUS.SHORT:
      return "color-mix(in srgb, var(--color-bad) 42%, var(--color-surface))";
    case STAFFING_STATUS.OVER:
      return "color-mix(in srgb, var(--color-over) 42%, var(--color-surface))";
    default:
      return null;
  }
}

export function staffingCellVisual(status) {
  if (status === STAFFING_STATUS.NONE) return null;
  const styles = staffingStatusStyles(status);
  const background = staffingCellBackground(status);
  if (!background) return null;

  return {
    background,
    boxShadow: `inset 0 0 0 1px ${styles.border}`,
  };
}

export function staffingStatusLabel(status, required, scheduled) {
  if (required <= 0) return `${scheduled} escalada${scheduled !== 1 ? "s" : ""}`;
  if (status === STAFFING_STATUS.SHORT) {
    const missing = required - scheduled;
    return `Faltam ${missing} · ${scheduled}/${required}`;
  }
  if (status === STAFFING_STATUS.OVER) {
    const extra = scheduled - required;
    return `+${extra} acima · ${scheduled}/${required}`;
  }
  if (status === STAFFING_STATUS.OK) return `Completo · ${scheduled}/${required}`;
  return `${scheduled}/${required}`;
}

export function pruneShiftNeeds(shiftNeeds, shiftIds) {
  const ids = new Set(shiftIds);
  return shiftNeeds.map((day) => {
    const next = {};
    for (const id of ids) {
      next[id] = typeof day?.[id] === "number" ? day[id] : 0;
    }
    return next;
  });
}
