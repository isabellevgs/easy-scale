import {
  getShiftRangeMinutes,
  isValidTime,
  parseTimeToMinutes,
} from "./ruleInterval";
import { shiftAppliesOnDate } from "./shifts";

function isRegularScaleType(value) {
  return value !== "plantao" && value !== "overtime";
}

export const HOUR_HEIGHT_PX = 48;
export const GRID_MIN_MINUTES = 7 * 60;
export const GRID_MAX_MINUTES = 26 * 60; // 02:00 (dia seguinte)

function resolveIntervalEndMinutes(intervalStart, intervalEnd) {
  let start = parseTimeToMinutes(intervalStart);
  let end = parseTimeToMinutes(intervalEnd);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

export function buildOccurrenceTimeline(occurrence, rule, shift) {
  const { start: shiftStart, end: shiftEnd } = getShiftRangeMinutes(shift);
  const hasInterval =
    isRegularScaleType(rule?.scaleType) &&
    isValidTime(rule?.intervalStart) &&
    isValidTime(rule?.intervalEnd);

  if (!hasInterval) {
    return {
      startMinutes: shiftStart,
      endMinutes: shiftEnd,
      segments: [{ type: "work", startMinutes: shiftStart, endMinutes: shiftEnd }],
    };
  }

  const { start: intervalStart, end: intervalEnd } = resolveIntervalEndMinutes(
    rule.intervalStart,
    rule.intervalEnd
  );

  const segments = [
    { type: "work", startMinutes: shiftStart, endMinutes: intervalStart },
    {
      type: "break",
      startMinutes: intervalStart,
      endMinutes: intervalEnd,
      intervalStart: rule.intervalStart,
      intervalEnd: rule.intervalEnd,
      label: `${rule.intervalStart} – ${rule.intervalEnd}`,
    },
    { type: "work", startMinutes: intervalEnd, endMinutes: shiftEnd },
  ].filter((segment) => segment.endMinutes > segment.startMinutes);

  return {
    startMinutes: shiftStart,
    endMinutes: shiftEnd,
    segments,
  };
}

export function getGridBounds() {
  return { minMinutes: GRID_MIN_MINUTES, maxMinutes: GRID_MAX_MINUTES };
}

export function buildHourMarks(
  minMinutes = GRID_MIN_MINUTES,
  maxMinutes = GRID_MAX_MINUTES
) {
  const marks = [];
  for (let minutes = minMinutes; minutes <= maxMinutes; minutes += 60) {
    marks.push(minutes);
  }
  return marks;
}

export function formatHourLabel(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  return `${String(hours).padStart(2, "0")}:00`;
}

function buildTimelineEvent(occurrence, rule, shift, people, holidays) {
  if (!shiftAppliesOnDate(shift, occurrence.date, holidays)) return null;

  const timeline = buildOccurrenceTimeline(occurrence, rule, shift);
  const person = people.find((item) => item.id === occurrence.personId);
  if (!person) return null;

  return {
    id: occurrence.id,
    occurrence,
    person,
    shift,
    rule,
    ...timeline,
  };
}

export function buildDayTimelineEvents(dayOccurrences, rulesById, shiftsById, people, holidays) {
  const events = [];

  for (const occurrence of dayOccurrences) {
    const shift = shiftsById[occurrence.shift];
    const rule = rulesById[occurrence.ruleId];
    if (!shift) continue;

    const event = buildTimelineEvent(occurrence, rule, shift, people, holidays);
    if (event) events.push(event);
  }

  return layoutDayEvents(events);
}

export function buildDayTimelineEventsWithStacks(
  dayOccurrences,
  rulesById,
  shiftsById,
  people,
  holidays
) {
  return buildDayTimelineEvents(dayOccurrences, rulesById, shiftsById, people, holidays);
}

function eventsOverlap(a, b) {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function layoutDayEvents(events) {
  if (!events.length) return [];

  const sorted = [...events].sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      b.endMinutes - b.startMinutes - (a.endMinutes - a.startMinutes) ||
      a.person.nome.localeCompare(b.person.nome, "pt-BR", { sensitivity: "base" })
  );

  return sorted.map((event) => {
    const overlapping = sorted.filter((other) => eventsOverlap(event, other));
    const stackSize = overlapping.length;
    const stackIndex = overlapping.findIndex((other) => other.id === event.id);

    return {
      ...event,
      column: stackIndex,
      columnCount: stackSize,
      stackIndex,
      stackSize,
      isStacked: stackSize > 1,
      stackPeers: overlapping,
    };
  });
}

export function clipTimelineToGrid(startMinutes, endMinutes, gridMinMinutes, gridMaxMinutes) {
  const start = Math.max(startMinutes, gridMinMinutes);
  const end = Math.min(endMinutes, gridMaxMinutes);
  if (end <= start) return null;
  return { start, end };
}

export function minutesToTopPx(minutes, gridMinMinutes, hourHeight = HOUR_HEIGHT_PX) {
  return ((minutes - gridMinMinutes) / 60) * hourHeight;
}

export function minutesToHeightPx(startMinutes, endMinutes, hourHeight = HOUR_HEIGHT_PX) {
  return ((endMinutes - startMinutes) / 60) * hourHeight;
}

export function gridHeightPx(minMinutes, maxMinutes, hourHeight = HOUR_HEIGHT_PX) {
  return minutesToHeightPx(minMinutes, maxMinutes, hourHeight);
}
