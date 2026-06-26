import { formatPersonInterval, normalizePersonIntervalMinutes } from "./constants";
import { isRegularScaleType } from "./rules";

export function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseTimeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutesToTime(time, minutes) {
  if (!isValidTime(time)) return "";
  return minutesToTime(parseTimeToMinutes(time) + minutes);
}

export function intervalDurationMinutes(intervalStart, intervalEnd) {
  if (!isValidTime(intervalStart) || !isValidTime(intervalEnd)) return 0;

  let start = parseTimeToMinutes(intervalStart);
  let end = parseTimeToMinutes(intervalEnd);
  if (end <= start) end += 24 * 60;
  return end - start;
}

export function getShiftRangeMinutes(shift) {
  let start = parseTimeToMinutes(shift.start);
  let end = parseTimeToMinutes(shift.end);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

export function isIntervalWithinShift(intervalStart, intervalEnd, shift) {
  if (!shift || !isValidTime(intervalStart) || !isValidTime(intervalEnd)) return false;

  const shiftRange = getShiftRangeMinutes(shift);
  const duration = intervalDurationMinutes(intervalStart, intervalEnd);
  if (duration <= 0) return false;

  const intervalStartMinutes = parseTimeToMinutes(intervalStart);
  const candidates = [intervalStartMinutes, intervalStartMinutes + 24 * 60];

  return candidates.some((start) => {
    const end = start + duration;
    return start >= shiftRange.start && end <= shiftRange.end;
  });
}

export function validateRegularRuleInterval({
  person,
  selectedShifts,
  intervalStart,
  intervalEnd,
}) {
  if (!person) {
    return {
      ok: false,
      error: "Selecione uma pessoa antes de configurar o horário do intervalo.",
      requiresPerson: true,
    };
  }

  if (!isValidTime(intervalStart) || !isValidTime(intervalEnd)) {
    return { ok: false, error: "Informe o horário de início e fim do intervalo." };
  }

  const duration = intervalDurationMinutes(intervalStart, intervalEnd);
  if (duration <= 0) {
    return { ok: false, error: "O fim do intervalo deve ser depois do início." };
  }

  const expectedMinutes = normalizePersonIntervalMinutes(person.intervalMinutes);
  if (duration !== expectedMinutes) {
    const difference = expectedMinutes - duration;
    const differenceLabel = formatPersonInterval(Math.abs(difference));
    const gapMessage =
      difference > 0
        ? ` Faltam ${differenceLabel} para fechar o horário do intervalo.`
        : ` O horário excede em ${differenceLabel}.`;

    return {
      ok: false,
      error: `O intervalo deve ter ${formatPersonInterval(expectedMinutes)} (duração cadastrada para ${person.nome}).${gapMessage}`,
    };
  }

  if (!selectedShifts.length) {
    return {
      ok: false,
      error: "Selecione ao menos um turno para validar o intervalo dentro do horário de trabalho.",
    };
  }

  for (const shift of selectedShifts) {
    if (!isIntervalWithinShift(intervalStart, intervalEnd, shift)) {
      return {
        ok: false,
        error: `O intervalo deve estar dentro do horário do turno ${shift.label} (${shift.start} – ${shift.end}).`,
      };
    }
  }

  return { ok: true };
}

export function normalizeRuleIntervalFields(raw, scaleType) {
  if (!isRegularScaleType(scaleType)) {
    return { intervalStart: "", intervalEnd: "" };
  }

  return {
    intervalStart: isValidTime(raw?.intervalStart) ? raw.intervalStart : "",
    intervalEnd: isValidTime(raw?.intervalEnd) ? raw.intervalEnd : "",
  };
}
