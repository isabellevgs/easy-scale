import { Sunrise, Sun, Moon, CloudSun, MoonStar } from "lucide-react";

export const SHIFT_IDS = ["manha", "tarde", "noite", "fds_manha", "fds_noite"];

export const DEFAULT_SHIFT_TIMES = {
  manha: { start: "06:00", end: "12:00" },
  tarde: { start: "12:00", end: "18:00" },
  noite: { start: "18:00", end: "00:00" },
  fds_manha: { start: "08:00", end: "14:00" },
  fds_noite: { start: "18:00", end: "00:00" },
};

const SHIFT_META = [
  {
    id: "manha",
    label: "Manhã",
    short: "M",
    icon: Sunrise,
    color: "var(--color-shift-morning)",
    soft: "var(--color-shift-morning-soft)",
  },
  {
    id: "tarde",
    label: "Tarde",
    short: "T",
    icon: Sun,
    color: "var(--color-shift-afternoon)",
    soft: "var(--color-shift-afternoon-soft)",
  },
  {
    id: "noite",
    label: "Noite",
    short: "N",
    icon: Moon,
    color: "var(--color-shift-night)",
    soft: "var(--color-shift-night-soft)",
  },
  {
    id: "fds_manha",
    label: "FDS/Feriado · Manhã",
    short: "FF-M",
    icon: CloudSun,
    color: "var(--color-shift-weekend-morning)",
    soft: "var(--color-shift-weekend-morning-soft)",
  },
  {
    id: "fds_noite",
    label: "FDS/Feriado · Noite",
    short: "FF-N",
    icon: MoonStar,
    color: "var(--color-shift-weekend-night)",
    soft: "var(--color-shift-weekend-night-soft)",
  },
];

function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeShiftTimes(raw) {
  const result = structuredClone(DEFAULT_SHIFT_TIMES);
  if (!raw || typeof raw !== "object") return result;

  for (const id of SHIFT_IDS) {
    const item = raw[id];
    if (item && isValidTime(item.start) && isValidTime(item.end)) {
      result[id] = { start: item.start, end: item.end };
    }
  }

  return result;
}

export function formatShiftTime({ start, end }) {
  return `${start}–${end}`;
}

export function buildShifts(shiftTimes = DEFAULT_SHIFT_TIMES) {
  const times = normalizeShiftTimes(shiftTimes);

  return SHIFT_META.map((meta) => {
    const slot = times[meta.id];
    return {
      ...meta,
      start: slot.start,
      end: slot.end,
      time: formatShiftTime(slot),
    };
  });
}

export function buildShiftsById(shiftTimes = DEFAULT_SHIFT_TIMES) {
  return Object.fromEntries(buildShifts(shiftTimes).map((shift) => [shift.id, shift]));
}

/** Ordem fixa de exibição conforme SHIFT_IDS. */
export function sortShiftIds(shiftIds) {
  if (!Array.isArray(shiftIds)) return [];
  return SHIFT_IDS.filter((id) => shiftIds.includes(id));
}
