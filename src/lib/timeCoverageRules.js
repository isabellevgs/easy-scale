import { WEEKDAY_LABELS } from "./constants";
import { toISODate } from "./schedule";
import { isValidTime, parseTimeToMinutes } from "./ruleInterval";
import { buildDayTimelineEvents } from "./weekTimeGrid";

function resolveWindowMinutes(timeStart, timeEnd) {
  let start = parseTimeToMinutes(timeStart);
  let end = parseTimeToMinutes(timeEnd);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

export function getRuleWindowMinutes(rule) {
  return resolveWindowMinutes(rule.timeStart, rule.timeEnd);
}

export function formatMinutesToTime(minutes) {
  const normalized = minutes % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function normalizeWeekdays(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
}

function ruleAppliesOnDay(rule, day) {
  const weekdays = normalizeWeekdays(rule.weekdays);
  if (weekdays.length === 0) return true;
  return weekdays.includes(day.getDay());
}

export function emptyTimeCoverageRule() {
  return {
    timeStart: "08:00",
    timeEnd: "12:00",
    requiredCount: 1,
    weekdays: [],
  };
}

export function normalizeTimeCoverageRules(rawRules) {
  if (!Array.isArray(rawRules)) return [];

  const seen = new Set();
  const result = [];

  for (let index = 0; index < rawRules.length; index += 1) {
    const raw = rawRules[index];
    if (!raw || typeof raw !== "object") continue;

    const id =
      typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `tcr_legacy_${index}`;
    if (seen.has(id)) continue;

    if (!isValidTime(raw.timeStart) || !isValidTime(raw.timeEnd)) continue;

    const { start, end } = resolveWindowMinutes(raw.timeStart, raw.timeEnd);
    if (end <= start) continue;

    const requiredCount = Math.max(1, Math.min(99, Math.floor(Number(raw.requiredCount) || 1)));

    seen.add(id);
    result.push({
      id,
      timeStart: raw.timeStart,
      timeEnd: raw.timeEnd,
      requiredCount,
      weekdays: normalizeWeekdays(raw.weekdays),
      label: typeof raw.label === "string" ? raw.label.trim() : "",
    });
  }

  return result;
}

export function createTimeCoverageRule(id) {
  return {
    id,
    ...emptyTimeCoverageRule(),
  };
}

function describeRuleWeekdays(weekdays) {
  if (weekdays.length === 0 || weekdays.length === 7) return "todos os dias";
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(", ");
}

export function describeTimeCoverageRule(rule) {
  const weekdays = normalizeWeekdays(rule.weekdays);
  const dayPart = describeRuleWeekdays(weekdays);

  const peopleLabel = rule.requiredCount === 1 ? "1 pessoa" : `${rule.requiredCount} pessoas`;
  const base = `${rule.timeStart} – ${rule.timeEnd}: mínimo de ${peopleLabel} (${dayPart})`;

  return rule.label ? `${rule.label} · ${base}` : base;
}

function collectWorkIntervals(events) {
  const intervals = [];

  for (const event of events) {
    for (const segment of event.segments) {
      if (segment.type !== "work") continue;
      intervals.push({
        personId: event.person.id,
        start: segment.startMinutes,
        end: segment.endMinutes,
      });
    }
  }

  return intervals;
}

export function buildRuleTimeSegments(timeStart, timeEnd) {
  const { start, end } = resolveWindowMinutes(timeStart, timeEnd);
  if (end <= start) return [];

  const boundaries = collectCoverageBoundaries(start, end, []);
  const segments = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const segmentStart = boundaries[index];
    const segmentEnd = boundaries[index + 1];
    if (segmentEnd <= segmentStart) continue;

    segments.push({
      start: segmentStart,
      end: segmentEnd,
      startLabel: formatMinutesToTime(segmentStart),
      endLabel: formatMinutesToTime(segmentEnd),
    });
  }

  return segments;
}

function collectCoverageBoundaries(ruleStart, ruleEnd, intervals) {
  const boundaries = new Set([ruleStart, ruleEnd]);

  for (let minutes = Math.ceil(ruleStart / 60) * 60; minutes < ruleEnd; minutes += 60) {
    boundaries.add(minutes);
  }

  for (const interval of intervals) {
    if (interval.end <= ruleStart || interval.start >= ruleEnd) continue;
    if (interval.start > ruleStart && interval.start < ruleEnd) {
      boundaries.add(interval.start);
    }
    if (interval.end > ruleStart && interval.end < ruleEnd) {
      boundaries.add(interval.end);
    }
  }

  return [...boundaries].sort((a, b) => a - b);
}

function buildCoverageEvaluationSegments(rule, intervals) {
  const { start: ruleStart, end: ruleEnd } = getRuleWindowMinutes(rule);
  if (ruleEnd <= ruleStart) return [];

  const boundaries = collectCoverageBoundaries(ruleStart, ruleEnd, intervals);
  const segments = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (end <= start) continue;

    segments.push({
      start,
      end,
      startLabel: formatMinutesToTime(start),
      endLabel: formatMinutesToTime(end),
    });
  }

  return segments;
}

function countPeopleAtMinute(intervals, minute) {
  const present = new Set();
  for (const interval of intervals) {
    if (interval.start <= minute && minute < interval.end) {
      present.add(interval.personId);
    }
  }
  return present.size;
}

function countPeopleWorkingInRange(intervals, rangeStart, rangeEnd) {
  if (rangeEnd <= rangeStart) return 0;
  return countPeopleAtMinute(intervals, rangeStart);
}

export function countMinPeopleWorkingInWindow(events, timeStart, timeEnd) {
  const intervals = collectWorkIntervals(events);
  const { start, end } = resolveWindowMinutes(timeStart, timeEnd);
  return countPeopleWorkingInRange(intervals, start, end);
}

export function evaluateTimeCoverageSegmentsForDay({
  day,
  dayOccurrences,
  rulesById,
  shiftsById,
  people,
  holidays,
  rule,
}) {
  if (!ruleAppliesOnDay(rule, day)) return [];

  const events = buildDayTimelineEvents(dayOccurrences, rulesById, shiftsById, people, holidays);
  const intervals = collectWorkIntervals(events);
  const segments = buildCoverageEvaluationSegments(rule, intervals);
  const failing = [];

  for (const segment of segments) {
    const actualCount = countPeopleWorkingInRange(intervals, segment.start, segment.end);
    if (actualCount >= rule.requiredCount) continue;

    failing.push({
      segmentStart: segment.start,
      segmentEnd: segment.end,
      segmentStartLabel: segment.startLabel,
      segmentEndLabel: segment.endLabel,
      actualCount,
      requiredCount: rule.requiredCount,
      deficit: rule.requiredCount - actualCount,
    });
  }

  return failing;
}

export function buildViolationTimeLabelsForSegments(
  violations,
  gridMinMinutes,
  gridMaxMinutes,
  clipToGrid
) {
  const byMinutes = new Map();

  for (const violation of violations) {
    const visible = clipToGrid(
      violation.segmentStart,
      violation.segmentEnd,
      gridMinMinutes,
      gridMaxMinutes
    );
    if (!visible) continue;

    const segmentStart = Math.max(violation.segmentStart, visible.start);
    const segmentEnd = Math.min(violation.segmentEnd, visible.end);
    if (segmentEnd <= segmentStart) continue;

    byMinutes.set(segmentStart, formatMinutesToTime(segmentStart));

    for (let minutes = Math.ceil(segmentStart / 60) * 60; minutes < segmentEnd; minutes += 60) {
      if (minutes > segmentStart) {
        byMinutes.set(minutes, formatMinutesToTime(minutes));
      }
    }

    if (segmentEnd > segmentStart) {
      byMinutes.set(segmentEnd, formatMinutesToTime(segmentEnd));
    }
  }

  return [...byMinutes.entries()]
    .map(([minutes, label]) => ({ minutes, label }))
    .sort((a, b) => a.minutes - b.minutes);
}

export function detectTimeCoverageViolations({
  days,
  occByDate,
  rules,
  shiftsById,
  people,
  holidays,
  timeCoverageRules,
}) {
  const rulesById = Object.fromEntries(rules.map((item) => [item.id, item]));
  const normalizedRules = normalizeTimeCoverageRules(timeCoverageRules);
  const violations = [];

  for (const rule of normalizedRules) {
    for (const day of days) {
      const dateISO = toISODate(day);
      const dayOccurrences = occByDate[dateISO] || [];
      const failingSegments = evaluateTimeCoverageSegmentsForDay({
        day,
        dayOccurrences,
        rulesById,
        shiftsById,
        people,
        holidays,
        rule,
      });

      for (const segment of failingSegments) {
        violations.push({
          ruleId: rule.id,
          rule,
          dateISO,
          day,
          ...segment,
        });
      }
    }
  }

  return violations;
}

export function mergeConsecutiveCoverageViolations(violations) {
  if (!violations.length) return [];

  const groups = new Map();

  for (const violation of violations) {
    const key = `${violation.ruleId}-${violation.dateISO}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(violation);
  }

  const merged = [];

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.segmentStart - b.segmentStart);
    let current = { ...sorted[0] };

    for (let index = 1; index < sorted.length; index += 1) {
      const next = sorted[index];
      if (next.segmentStart === current.segmentEnd) {
        current = {
          ...current,
          segmentEnd: next.segmentEnd,
          segmentEndLabel: next.segmentEndLabel,
          actualCount: Math.min(current.actualCount, next.actualCount),
          deficit: Math.max(current.deficit, next.deficit),
        };
        continue;
      }

      merged.push(current);
      current = { ...next };
    }

    merged.push(current);
  }

  return merged.sort(
    (a, b) =>
      a.dateISO.localeCompare(b.dateISO) ||
      a.segmentStart - b.segmentStart ||
      a.ruleId.localeCompare(b.ruleId)
  );
}

export function mergeDayCoverageViolationBands(violations) {
  if (!violations?.length) return [];

  const sorted = [...violations].sort((a, b) => a.segmentStart - b.segmentStart);
  const ranges = [
    {
      segmentStart: sorted[0].segmentStart,
      segmentEnd: sorted[0].segmentEnd,
      actualCount: sorted[0].actualCount,
      requiredCount: sorted[0].requiredCount,
    },
  ];

  for (let index = 1; index < sorted.length; index += 1) {
    const last = ranges[ranges.length - 1];
    const next = sorted[index];

    if (next.segmentStart <= last.segmentEnd) {
      last.segmentEnd = Math.max(last.segmentEnd, next.segmentEnd);
      last.actualCount = Math.min(last.actualCount, next.actualCount);
      last.requiredCount = Math.max(last.requiredCount, next.requiredCount);
      continue;
    }

    ranges.push({
      segmentStart: next.segmentStart,
      segmentEnd: next.segmentEnd,
      actualCount: next.actualCount,
      requiredCount: next.requiredCount,
    });
  }

  return ranges;
}

export function formatTimeCoverageViolationMessage(violation) {
  const dayLabel = WEEKDAY_LABELS[violation.day.getDay()];
  const timeRange = `${formatMinutesToTime(violation.segmentStart)} - ${formatMinutesToTime(violation.segmentEnd)}`;
  const ruleName = violation.rule.label?.trim();

  return {
    id: `${violation.ruleId}-${violation.dateISO}-${violation.segmentStart}-${violation.segmentEnd}`,
    headline: ruleName ? `${dayLabel} · ${timeRange} · ${ruleName}` : `${dayLabel} · ${timeRange}`,
    detail: `${violation.actualCount} de ${violation.requiredCount} pessoas · faltam ${violation.deficit}`,
  };
}

export function countTimeCoverageRules(timeCoverageRules = []) {
  return normalizeTimeCoverageRules(timeCoverageRules).length;
}
