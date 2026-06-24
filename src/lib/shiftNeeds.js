import { SHIFT_IDS } from "./shifts";

/** Índices 0–6 = dom–sáb; 7 = template de feriado. */
export const FERIADO_DAY_INDEX = 7;
export const NEED_DAY_COUNT = 8;

export const WEEKEND_DAYS = new Set([0, 6]);

export const REGULAR_SHIFT_IDS = ["manha", "tarde", "noite"];
export const FDS_SHIFT_IDS = ["fds_manha", "fds_noite"];

function isWeekdayRow(dayIndex) {
  return dayIndex >= 1 && dayIndex <= 5;
}

function isWeekendOrFeriadoRow(dayIndex) {
  return dayIndex === FERIADO_DAY_INDEX || WEEKEND_DAYS.has(dayIndex);
}

export function isShiftNeedEditable(dayIndex, shiftId) {
  if (REGULAR_SHIFT_IDS.includes(shiftId)) return isWeekdayRow(dayIndex);
  if (FDS_SHIFT_IDS.includes(shiftId)) return isWeekendOrFeriadoRow(dayIndex);
  return true;
}

export function shiftNeedDisabledReason(dayIndex, shiftId) {
  if (isShiftNeedEditable(dayIndex, shiftId)) return "";
  if (REGULAR_SHIFT_IDS.includes(shiftId)) {
    return "Manhã, Tarde e Noite só têm meta de segunda a sexta";
  }
  return "FDS/Feriado só tem meta aos fins de semana e na linha Feriado";
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

export function createEmptyDayNeeds() {
  return Object.fromEntries(SHIFT_IDS.map((id) => [id, 0]));
}

export function normalizeShiftNeeds(raw) {
  const result = Array.from({ length: NEED_DAY_COUNT }, () => createEmptyDayNeeds());
  if (!raw) return result;

  for (let day = 0; day < NEED_DAY_COUNT; day += 1) {
    const dayRaw = Array.isArray(raw) ? raw[day] : raw[day] ?? raw[String(day)];
    if (!dayRaw || typeof dayRaw !== "object") continue;

    for (const id of SHIFT_IDS) {
      if (!isShiftNeedEditable(day, id)) {
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

export function getShiftNeed(shiftNeeds, dayIndex, shiftId) {
  if (!isShiftNeedEditable(dayIndex, shiftId)) return 0;
  const day = shiftNeeds?.[dayIndex];
  if (!day) return 0;
  const value = day[shiftId];
  return typeof value === "number" && value >= 0 ? value : 0;
}

export function getShiftNeedForDate(shiftNeeds, dateISO, shiftId, holidays = []) {
  const dayIndex = resolveNeedDayIndex(dateISO, holidays);
  return getShiftNeed(shiftNeeds, dayIndex, shiftId);
}

export function isDefaultShiftNeeds(shiftNeeds) {
  const normalized = normalizeShiftNeeds(shiftNeeds);
  return normalized.every((day) => SHIFT_IDS.every((id) => day[id] === 0));
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

export function getShiftStaffing(dayOccurrences, shiftId, shiftNeeds, dayIndex) {
  const required = getShiftNeed(shiftNeeds, dayIndex, shiftId);
  const scheduled = dayOccurrences.filter((occ) => occ.shift === shiftId).length;
  const status = getStaffingStatus(required, scheduled);

  return { required, scheduled, status };
}

export function getDayStaffingRows(dayOccurrences, shiftNeeds, dateISO, shiftIds, holidays = []) {
  const dayIndex = resolveNeedDayIndex(dateISO, holidays);
  return shiftIds
    .map((shiftId) => ({
      shiftId,
      ...getShiftStaffing(dayOccurrences, shiftId, shiftNeeds, dayIndex),
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
        bg: "color-mix(in srgb, var(--color-brand) 16%, transparent)",
        border: "color-mix(in srgb, var(--color-brand) 42%, transparent)",
        text: "var(--color-brand)",
      };
    default:
      return {
        bg: "var(--color-surface-2)",
        border: "var(--color-border-soft)",
        text: "var(--color-ink-soft)",
      };
  }
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
