import { addDays, format, parseISO } from "date-fns";
import { colorForPerson } from "./constants";
import { describeScaleType } from "./rules";
import { formatShiftTime } from "./shifts";
import { downloadZipArchive } from "./zipStore";
import { buildOccurrenceTimeline } from "./weekTimeGrid";

const CRLF = "\r\n";

function escapeIcsText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldIcsLine(line) {
  if (line.length <= 75) return line;
  const parts = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join(CRLF);
}

function normalizeIcsColor(colorHex) {
  if (typeof colorHex !== "string") return null;
  const hex = colorHex.trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(hex) ? hex : null;
}

function buildCalendarHeader(calendarName, colorHex) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EasyScale//Schedule Export//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(calendarName)}`),
  ];

  const color = normalizeIcsColor(colorHex);
  if (color) {
    lines.push(foldIcsLine(`COLOR:#${color}`));
    lines.push(foldIcsLine(`X-APPLE-CALENDAR-COLOR:#${color}`));
  }

  return lines.join(CRLF);
}

function minutesToIcsLocalDateTime(dateISO, totalMinutes) {
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minutesInDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  const date = addDays(parseISO(dateISO), dayOffset);
  return (
    format(date, "yyyyMMdd") +
    `T${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`
  );
}

function buildVeventBlock({
  uid,
  dateISO,
  startMinutes,
  endMinutes,
  summary,
  description,
  colorHex,
}) {
  const dtStart = minutesToIcsLocalDateTime(dateISO, startMinutes);
  const dtEnd = minutesToIcsLocalDateTime(dateISO, endMinutes);
  if (!dtStart || !dtEnd) return null;

  const stamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const lines = [
    "BEGIN:VEVENT",
    foldIcsLine(`UID:${uid}`),
    foldIcsLine(`DTSTAMP:${stamp}`),
    foldIcsLine(`DTSTART:${dtStart}`),
    foldIcsLine(`DTEND:${dtEnd}`),
    foldIcsLine(`SUMMARY:${escapeIcsText(summary)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(description)}`),
  ];

  const color = normalizeIcsColor(colorHex);
  if (color) {
    lines.push(foldIcsLine(`COLOR:#${color}`));
  }

  lines.push("END:VEVENT");
  return lines.join(CRLF);
}

function buildVeventsFromOccurrence({ occurrence, person, shift, rule, summary, people }) {
  const timeline = buildOccurrenceTimeline(occurrence, rule, shift);
  const eventSummary = summary || person.nome;
  const color = colorForPerson(person.id, people);
  const shiftDescription = `${shift.label} · ${formatShiftTime(shift)} · ${describeScaleType(occurrence.scaleType)}`;
  const events = [];

  const shiftEvent = buildVeventBlock({
    uid: `${occurrence.id}@easyscale`,
    dateISO: occurrence.date,
    startMinutes: timeline.startMinutes,
    endMinutes: timeline.endMinutes,
    summary: eventSummary,
    description: shiftDescription,
    colorHex: color,
  });
  if (shiftEvent) events.push(shiftEvent);

  const breakSegment = timeline.segments.find((segment) => segment.type === "break");
  if (breakSegment) {
    const intervalEvent = buildVeventBlock({
      uid: `${occurrence.id}-interval@easyscale`,
      dateISO: occurrence.date,
      startMinutes: breakSegment.startMinutes,
      endMinutes: breakSegment.endMinutes,
      summary: "Intervalo",
      description: breakSegment.label || `${rule.intervalStart} – ${rule.intervalEnd}`,
      colorHex: color,
    });
    if (intervalEvent) events.push(intervalEvent);
  }

  return events;
}

function filterOccurrences(occurrences, rangeStartISO, rangeEndISO) {
  return (occurrences || []).filter((occurrence) => {
    if (rangeStartISO && occurrence.date < rangeStartISO) return false;
    if (rangeEndISO && occurrence.date > rangeEndISO) return false;
    return true;
  });
}

function sortOccurrences(occurrences, shiftsById) {
  return [...occurrences].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const shiftA = shiftsById[a.shift];
    const shiftB = shiftsById[b.shift];
    return (shiftA?.start || "").localeCompare(shiftB?.start || "");
  });
}

function slugifyFilename(value) {
  const slug = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "pessoa";
}

export function buildIcsCalendar({
  occurrences,
  people,
  shiftsById,
  rulesById = {},
  calendarName = "EasyScale",
  calendarColor,
  rangeStartISO,
  rangeEndISO,
  eventSummary,
}) {
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));
  const events = [];

  for (const occurrence of sortOccurrences(filterOccurrences(occurrences, rangeStartISO, rangeEndISO), shiftsById)) {
    const person = peopleById[occurrence.personId];
    const shift = shiftsById[occurrence.shift];
    const rule = rulesById[occurrence.ruleId];
    if (!person || !shift) continue;

    const occurrenceEvents = buildVeventsFromOccurrence({
      occurrence,
      person,
      shift,
      rule,
      summary: eventSummary === "person" ? person.nome : eventSummary,
      people,
    });
    events.push(...occurrenceEvents);
  }

  const header = buildCalendarHeader(calendarName, calendarColor);
  const body = events.length > 0 ? events.join(CRLF) : "";
  const footer = "END:VCALENDAR";

  return body ? `${header}${CRLF}${body}${CRLF}${footer}` : `${header}${CRLF}${footer}`;
}

export function downloadIcs(content, filename) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadScheduleIcs({
  occurrences,
  people,
  shiftsById,
  rulesById,
  filename,
  calendarName,
  rangeStartISO,
  rangeEndISO,
}) {
  const content = buildIcsCalendar({
    occurrences,
    people,
    shiftsById,
    rulesById,
    calendarName,
    rangeStartISO,
    rangeEndISO,
    eventSummary: "person",
  });

  const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
  if (eventCount === 0) {
    throw new Error("Não há escalas no período para exportar.");
  }

  downloadIcs(content, filename);
  return eventCount;
}

export function downloadScheduleIcsPerPerson({
  occurrences,
  people,
  shiftsById,
  rulesById,
  filename,
  rangeStartISO,
  rangeEndISO,
}) {
  const filtered = filterOccurrences(occurrences, rangeStartISO, rangeEndISO);
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));
  const byPerson = new Map();

  for (const occurrence of filtered) {
    if (!byPerson.has(occurrence.personId)) {
      byPerson.set(occurrence.personId, []);
    }
    byPerson.get(occurrence.personId).push(occurrence);
  }

  if (byPerson.size === 0) {
    throw new Error("Não há escalas no período para exportar.");
  }

  const zipFiles = [];

  for (const [personId, personOccurrences] of byPerson) {
    const person = peopleById[personId];
    if (!person) continue;

    const color = colorForPerson(person.id, people);
    const content = buildIcsCalendar({
      occurrences: personOccurrences,
      people,
      shiftsById,
      rulesById,
      calendarName: person.nome,
      calendarColor: color,
      eventSummary: "person",
    });

    const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
    if (eventCount === 0) continue;

    zipFiles.push({
      path: `${slugifyFilename(person.nome)}.ics`,
      content,
    });
  }

  if (zipFiles.length === 0) {
    throw new Error("Não há escalas no período para exportar.");
  }

  downloadZipArchive(zipFiles, filename);

  const eventCount = zipFiles.reduce(
    (total, file) => total + ((file.content.match(/BEGIN:VEVENT/g) || []).length),
    0
  );

  return { personCount: zipFiles.length, eventCount };
}
