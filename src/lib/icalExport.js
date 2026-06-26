import { addDays, format, parseISO } from "date-fns";
import { colorForPerson } from "./constants";
import { describeScaleType } from "./rules";
import { formatShiftTime } from "./shifts";
import { downloadZipArchive } from "./zipStore";

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

function parseClockTime(timeStr) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr || "");
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function shiftCrossesMidnight(start, end) {
  const startParts = parseClockTime(start);
  const endParts = parseClockTime(end);
  if (!startParts || !endParts) return false;

  const startMinutes = startParts.hours * 60 + startParts.minutes;
  const endMinutes = endParts.hours * 60 + endParts.minutes;
  return endMinutes <= startMinutes;
}

function toIcsLocalDateTime(dateISO, timeStr, dayOffset = 0) {
  const parts = parseClockTime(timeStr);
  if (!parts) return null;

  const date = addDays(parseISO(dateISO), dayOffset);
  return format(date, "yyyyMMdd") + `T${String(parts.hours).padStart(2, "0")}${String(parts.minutes).padStart(2, "0")}00`;
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

function buildVevent({ occurrence, person, shift, summary, people }) {
  const crossesMidnight = shiftCrossesMidnight(shift.start, shift.end);
  const dtStart = toIcsLocalDateTime(occurrence.date, shift.start);
  const dtEnd = toIcsLocalDateTime(occurrence.date, shift.end, crossesMidnight ? 1 : 0);

  if (!dtStart || !dtEnd) return null;

  const eventSummary = summary || person.nome;
  const description = `${shift.label} · ${formatShiftTime(shift)} · ${describeScaleType(occurrence.scaleType)}`;
  const uid = `${occurrence.id}@easyscale`;
  const stamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  const lines = [
    "BEGIN:VEVENT",
    foldIcsLine(`UID:${uid}`),
    foldIcsLine(`DTSTAMP:${stamp}`),
    foldIcsLine(`DTSTART:${dtStart}`),
    foldIcsLine(`DTEND:${dtEnd}`),
    foldIcsLine(`SUMMARY:${escapeIcsText(eventSummary)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(description)}`),
  ];

  const color = normalizeIcsColor(colorForPerson(person.id, people));
  if (color) {
    lines.push(foldIcsLine(`COLOR:#${color}`));
  }

  lines.push("END:VEVENT");
  return lines.join(CRLF);
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
    if (!person || !shift) continue;

    const event = buildVevent({
      occurrence,
      person,
      shift,
      summary: eventSummary === "person" ? person.nome : eventSummary,
      people,
    });
    if (event) events.push(event);
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
  filename,
  calendarName,
  rangeStartISO,
  rangeEndISO,
}) {
  const content = buildIcsCalendar({
    occurrences,
    people,
    shiftsById,
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

function buildImportReadme(entries) {
  const lines = [
    "EasyScale — importar no Google Calendar",
    "",
    "1. Importe cada arquivo .ics separadamente.",
    "2. Ao importar, escolha Criar nova agenda (o nome já vem no arquivo).",
    "3. O Google Calendar não aplica cor automaticamente na importação.",
    "    Use a cor indicada abaixo em Configurações da agenda.",
    "",
    "Agendas e cores:",
    ...entries.map(({ name, color }) => `- ${name}: ${color}`),
    "",
    "No Apple Calendar e em outros apps, a cor pode ser aplicada automaticamente.",
  ];
  return lines.join("\n");
}

export function downloadScheduleIcsPerPerson({
  occurrences,
  people,
  shiftsById,
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

  const readmeEntries = [];
  const zipFiles = [];

  for (const [personId, personOccurrences] of byPerson) {
    const person = peopleById[personId];
    if (!person) continue;

    const color = colorForPerson(person.id, people);
    const content = buildIcsCalendar({
      occurrences: personOccurrences,
      people,
      shiftsById,
      calendarName: person.nome,
      calendarColor: color,
      eventSummary: "person",
    });

    const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
    if (eventCount === 0) continue;

    readmeEntries.push({ name: person.nome, color });
    zipFiles.push({
      path: `agendas/${slugifyFilename(person.nome)}.ics`,
      content,
    });
  }

  if (zipFiles.length === 0) {
    throw new Error("Não há escalas no período para exportar.");
  }

  zipFiles.unshift({
    path: "COMO-IMPORTAR.txt",
    content: buildImportReadme(readmeEntries),
  });

  downloadZipArchive(zipFiles, filename);

  const eventCount = zipFiles
    .slice(1)
    .reduce((total, file) => total + ((file.content.match(/BEGIN:VEVENT/g) || []).length), 0);

  return { personCount: zipFiles.length - 1, eventCount };
}
