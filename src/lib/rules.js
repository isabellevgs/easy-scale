export const SCALE_TYPES = {
  REGULAR: "regular",
  PLANTAO: "plantao",
  OVERTIME: "overtime",
};

export const SCALE_TYPE_OPTIONS = [
  { id: SCALE_TYPES.REGULAR, label: "Regular" },
  { id: SCALE_TYPES.PLANTAO, label: "Plantão" },
  { id: SCALE_TYPES.OVERTIME, label: "Hora extra" },
];

export function normalizeScaleType(value) {
  if (value === SCALE_TYPES.OVERTIME) return SCALE_TYPES.OVERTIME;
  if (value === SCALE_TYPES.PLANTAO) return SCALE_TYPES.PLANTAO;
  return SCALE_TYPES.REGULAR;
}

export function describeScaleType(scaleType) {
  const normalized = normalizeScaleType(scaleType);
  return SCALE_TYPE_OPTIONS.find((option) => option.id === normalized)?.label ?? "Regular";
}

export function isRegularScaleType(value) {
  return normalizeScaleType(value) === SCALE_TYPES.REGULAR;
}

export function isNonRegularScaleType(value) {
  return !isRegularScaleType(value);
}

export function scaleTypeBadge(scaleType) {
  const normalized = normalizeScaleType(scaleType);
  if (normalized === SCALE_TYPES.OVERTIME) {
    return { label: "Hora extra", className: "bg-amber-500/15 text-amber-600" };
  }
  if (normalized === SCALE_TYPES.PLANTAO) {
    return { label: "Plantão", className: "bg-violet-500/15 text-violet-600" };
  }
  return null;
}

export function emptyRule(personId) {
  return {
    personId: personId || "",
    shifts: [],
    scaleType: SCALE_TYPES.REGULAR,
    recurrence: { type: "weekly", weekdays: [] },
    startDate: "",
    endDate: "",
  };
}

const VALID_RECURRENCE_TYPES = new Set([
  "specific_date",
  "specific_dates",
  "weekly",
  "custom",
  "monthly",
  "specific_months",
]);

function normalizeRecurrence(raw) {
  if (!raw || typeof raw !== "object" || !VALID_RECURRENCE_TYPES.has(raw.type)) {
    return { type: "weekly", weekdays: [] };
  }
  return raw;
}

export function normalizeScheduleRules(rawRules, shiftIds = []) {
  if (!Array.isArray(rawRules)) return [];

  const allowedShifts = new Set(shiftIds);
  const seen = new Set();
  const result = [];

  for (const raw of rawRules) {
    if (!raw || typeof raw !== "object") continue;
    if (typeof raw.id !== "string" || !raw.id.trim()) continue;
    if (typeof raw.personId !== "string" || !raw.personId.trim()) continue;
    if (seen.has(raw.id)) continue;

    const shifts = Array.isArray(raw.shifts)
      ? [...new Set(raw.shifts.filter((id) => typeof id === "string" && allowedShifts.has(id)))]
      : [];
    if (shifts.length === 0) continue;

    seen.add(raw.id);
    result.push({
      id: raw.id.trim(),
      personId: raw.personId.trim(),
      shifts,
      scaleType: normalizeScaleType(raw.scaleType),
      recurrence: normalizeRecurrence(raw.recurrence),
      startDate: typeof raw.startDate === "string" ? raw.startDate : "",
      endDate: typeof raw.endDate === "string" ? raw.endDate : "",
    });
  }

  return result;
}
