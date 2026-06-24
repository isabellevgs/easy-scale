export function emptyRule(personId) {
  return {
    personId: personId || "",
    shifts: [],
    recurrence: { type: "weekly", weekdays: [] },
    startDate: "",
    endDate: "",
  };
}
