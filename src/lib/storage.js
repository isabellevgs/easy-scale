import { normalizeShifts, DEFAULT_SHIFTS } from "./shifts";
import { normalizeShiftNeedsForShifts, normalizeHolidays } from "./shiftNeeds";
import {
  sortPeopleByName,
  isValidPersonColor,
  normalizeHexColor,
  normalizePersonIntervalMinutes,
  PEOPLE_PALETTE,
} from "./constants";
import { resolveConsistencyRules } from "./consistencyRules";
import { getShiftIds } from "./shifts";
import { normalizeScheduleRules } from "./rules";

const STORAGE_KEY = "easyscale:v1";

export const DEFAULT_STATE = {
  people: [],
  rules: [],
  shifts: DEFAULT_SHIFTS,
  shiftNeeds: normalizeShiftNeedsForShifts(null, DEFAULT_SHIFTS),
  holidays: [],
  consistencyRules: [],
};

function normalizePerson(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || typeof raw.nome !== "string") {
    return null;
  }

  const nome = raw.nome.trim();
  if (!nome) return null;

  const person = { id: raw.id, nome };
  const cargo = typeof raw.cargo === "string" ? raw.cargo.trim() : "";
  if (cargo) person.cargo = cargo;
  if (isValidPersonColor(raw.color)) person.color = normalizeHexColor(raw.color);
  person.intervalMinutes = normalizePersonIntervalMinutes(raw.intervalMinutes);
  return person;
}

function ensurePersonColor(people) {
  return people.map((person, idx) => {
    if (person.color && isValidPersonColor(person.color)) {
      return { ...person, color: normalizeHexColor(person.color) };
    }
    return { ...person, color: PEOPLE_PALETTE[idx % PEOPLE_PALETTE.length] };
  });
}

export function normalizeState(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return structuredClone(DEFAULT_STATE);
  }

  const shifts = normalizeShifts(parsed.shifts, parsed.shiftTimes);
  const shiftIds = getShiftIds(shifts);
  const people = Array.isArray(parsed.people)
    ? ensurePersonColor(sortPeopleByName(parsed.people.map(normalizePerson).filter(Boolean)))
    : [];

  return {
    people,
    rules: normalizeScheduleRules(parsed.rules, shiftIds),
    shifts,
    shiftNeeds: normalizeShiftNeedsForShifts(parsed.shiftNeeds, shifts),
    holidays: normalizeHolidays(parsed.holidays),
    consistencyRules: resolveConsistencyRules(parsed, shiftIds),
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
    return { ok: true };
  } catch (err) {
    const isQuota = err?.name === "QuotaExceededError";
    return {
      ok: false,
      error: isQuota
        ? "Espaço de armazenamento esgotado neste dispositivo."
        : "Não foi possível salvar as alterações neste dispositivo.",
    };
  }
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
