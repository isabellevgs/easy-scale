export const SHIFT_SCOPES = {
  weekday: { id: "weekday", label: "Segunda a sexta" },
  weekend: { id: "weekend", label: "Sábado, domingo e feriados" },
};

export const DEFAULT_SHIFTS = [
  { id: "manha", label: "Manhã", start: "06:00", end: "12:00", scope: "weekday" },
  { id: "tarde", label: "Tarde", start: "12:00", end: "18:00", scope: "weekday" },
  { id: "noite", label: "Noite", start: "18:00", end: "00:00", scope: "weekday" },
  {
    id: "fds_manha",
    label: "FDS/Feriado · Manhã",
    start: "08:00",
    end: "14:00",
    scope: "weekend",
  },
  {
    id: "fds_noite",
    label: "FDS/Feriado · Noite",
    start: "18:00",
    end: "00:00",
    scope: "weekend",
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
  manha: 0,
  tarde: 1,
  noite: 2,
  fds_manha: 3,
  fds_noite: 4,
};

function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidScope(value) {
  return value === "weekday" || value === "weekend";
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
  const scope = isValidScope(raw?.scope) ? raw.scope : defaults.scope;

  return { id, label, start, end, scope };
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

  return {
    ...shift,
    ...visual,
    short: generateShort(shift.label),
    time: formatShiftTime(shift),
    scopeLabel: SHIFT_SCOPES[shift.scope]?.label ?? "",
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
      current.scope === defaults.scope
    );
  });
}

export function createEmptyShift() {
  return {
    id: "",
    label: "",
    start: "08:00",
    end: "16:00",
    scope: "weekday",
  };
}

export function countRulesUsingShift(rules, shiftId) {
  if (!Array.isArray(rules)) return 0;
  return rules.filter((rule) => Array.isArray(rule.shifts) && rule.shifts.includes(shiftId)).length;
}
