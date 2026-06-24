export { DEFAULT_SHIFT_TIMES, buildShifts, buildShiftsById, normalizeShiftTimes } from "./shifts";

// Paleta de accent para diferenciar pessoas em visões com várias pessoas
export const PEOPLE_PALETTE = [
  "#f5a623",
  "#6c7ee8",
  "#4caf7d",
  "#ec7c4f",
  "#c084fc",
  "#42b6f5",
  "#e2615c",
  "#42c9a8",
];

export function colorForPerson(personId, people) {
  const idx = people.findIndex((p) => p.id === personId);
  if (idx === -1) return PEOPLE_PALETTE[0];
  return PEOPLE_PALETTE[idx % PEOPLE_PALETTE.length];
}

export function sortPeopleByName(people) {
  return [...people].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
  );
}

export function peopleScheduledIn(occurrences, people) {
  const scheduled = new Set(occurrences.map((o) => o.personId));
  return sortPeopleByName(people.filter((p) => scheduled.has(p.id)));
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LABELS_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
