import { normalizeShiftTimes, DEFAULT_SHIFT_TIMES } from "./shifts";
import { normalizeShiftNeeds, normalizeHolidays } from "./shiftNeeds";
import { sortPeopleByName } from "./constants";

const STORAGE_KEY = "easyscale:v1";

export const DEFAULT_STATE = {
  people: [],
  rules: [],
  shiftTimes: DEFAULT_SHIFT_TIMES,
  shiftNeeds: normalizeShiftNeeds(null),
  holidays: [],
};

export function normalizeState(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return structuredClone(DEFAULT_STATE);
  }

  return {
    people: Array.isArray(parsed.people) ? sortPeopleByName(parsed.people) : [],
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    shiftTimes: normalizeShiftTimes(parsed.shiftTimes),
    shiftNeeds: normalizeShiftNeeds(parsed.shiftNeeds),
    holidays: normalizeHolidays(parsed.holidays),
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return normalizeState(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponível (modo privado, quota etc.) — falha silenciosa
  }
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
