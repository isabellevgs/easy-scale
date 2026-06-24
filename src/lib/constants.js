export { DEFAULT_SHIFT_TIMES, buildShifts, buildShiftsById, normalizeShiftTimes } from "./shifts";

// Cores dos alertas de staffing — pessoas não devem usar tons próximos a estes
export const STAFFING_ALERT_COLORS = ["#4caf7d", "#e2615c", "#42b6f5"];

// Paleta pronta: tons quentes e roxos/rosas, sem verde/vermelho/azul dos alertas
export const PEOPLE_PALETTE = [
  "#f5a623",
  "#f97316",
  "#fb923c",
  "#ea580c",
  "#eab308",
  "#facc15",
  "#ca8a04",
  "#d97706",
  "#c084fc",
  "#a855f7",
  "#9333ea",
  "#7c3aed",
  "#d946ef",
  "#e879f9",
  "#f472b6",
  "#db2777",
];

const ALERT_COLOR_MIN_DISTANCE = 55;

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function colorDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

export function normalizeHexColor(value) {
  if (typeof value !== "string") return null;
  let hex = value.trim().toLowerCase();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null;
  return hex;
}

export function conflictsWithAlertColors(color) {
  const hex = normalizeHexColor(color);
  if (!hex) return true;
  return STAFFING_ALERT_COLORS.some(
    (alert) => colorDistance(hex, alert) < ALERT_COLOR_MIN_DISTANCE
  );
}

export function personColorError(color) {
  const hex = normalizeHexColor(color);
  if (!hex) return "Informe um código hex válido (ex.: #a855f7).";
  if (conflictsWithAlertColors(hex)) {
    return "Esta cor é muito parecida com os alertas da escala (verde, vermelho ou azul).";
  }
  return null;
}

export function isValidPersonColor(color) {
  return personColorError(color) === null;
}

export function defaultColorForPerson(personId, people) {
  const idx = people.findIndex((p) => p.id === personId);
  if (idx === -1) return PEOPLE_PALETTE[people.length % PEOPLE_PALETTE.length];
  return PEOPLE_PALETTE[idx % PEOPLE_PALETTE.length];
}

export function colorForPerson(personId, people) {
  const person = people.find((p) => p.id === personId);
  if (person?.color && isValidPersonColor(person.color)) return normalizeHexColor(person.color);
  return defaultColorForPerson(personId, people);
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
