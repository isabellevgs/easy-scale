export const SCALE_TYPES = {
  REGULAR: "regular",
  OVERTIME: "overtime",
};

export const SCALE_TYPE_OPTIONS = [
  { id: SCALE_TYPES.REGULAR, label: "Regular" },
  { id: SCALE_TYPES.OVERTIME, label: "Hora extra" },
];

export function normalizeScaleType(value) {
  return value === SCALE_TYPES.OVERTIME ? SCALE_TYPES.OVERTIME : SCALE_TYPES.REGULAR;
}

export function describeScaleType(scaleType) {
  return normalizeScaleType(scaleType) === SCALE_TYPES.OVERTIME ? "Hora extra" : "Regular";
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
