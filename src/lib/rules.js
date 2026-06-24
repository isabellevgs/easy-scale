import { toISODate } from "./schedule";

export function emptyRule(personId) {
  return {
    personId: personId || "",
    shifts: [],
    recurrence: { type: "weekly", weekdays: [] },
    startDate: toISODate(new Date()),
    endDate: "",
  };
}
