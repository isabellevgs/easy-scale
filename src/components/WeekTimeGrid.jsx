import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "./ui";
import { toISODate, describePersonScaleOverlap } from "../lib/schedule";
import { colorForPerson, WEEKDAY_LABELS } from "../lib/constants";
import {
  buildDayTimelineEventsWithStacks,
  buildHourMarks,
  clipTimelineToGrid,
  formatHourLabel,
  getGridBounds,
  gridHeightPx,
  minutesToHeightPx,
  minutesToTopPx,
} from "../lib/weekTimeGrid";
import { buildViolationTimeLabelsForSegments, formatMinutesToTime, mergeDayCoverageViolationBands } from "../lib/timeCoverageRules";
import PersonScaleOverlapIcon from "./PersonScaleOverlapIcon";

const GRID_HEADER_HEIGHT_PX = 52;
const GRID_TIME_GUTTER_PX = 56;
const GRID_BODY_TOP_INSET_PX = 6;
const STACK_STEP_PX = 26;
const STACK_EDGE_PADDING_PX = 4;
const GRID_COLUMNS = `${GRID_TIME_GUTTER_PX}px repeat(7, minmax(0, 1fr))`;

function chipTextColor(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0c0d10" : "#ffffff";
}

function DayColumnHeader({ day, todayISO, hasViolation }) {
  const iso = toISODate(day);
  const isToday = iso === todayISO;
  const dayIndex = day.getDay();

  return (
    <div
      className={`flex h-full flex-col items-center justify-center px-2 ${
        isToday ? "bg-brand-soft/40" : "bg-surface"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          hasViolation ? "text-bad" : isToday ? "text-brand" : "text-ink-soft"
        }`}
      >
        {WEEKDAY_LABELS[dayIndex]}
      </p>
      <p
        className={`mt-1 text-[20px] font-medium tabular-nums leading-none ${
          isToday
            ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[14px] font-semibold text-[var(--color-base)]"
            : "text-ink"
        }`}
      >
        {format(day, "d", { locale: ptBR })}
      </p>
    </div>
  );
}

function EventHeader({ name, time, overlapLabel, compact = false }) {
  return (
    <div className={`shrink-0 ${compact ? "px-1 py-1.5" : "px-2 pt-1.5 pb-1"}`}>
      <p className="truncate text-[11px] font-semibold leading-tight">
        <span className="inline-flex items-center gap-1">
          {overlapLabel && (
            <PersonScaleOverlapIcon
              title={overlapLabel}
              className="h-3 w-3 shrink-0 text-amber-300 drop-shadow-sm"
            />
          )}
          {name}
        </span>
      </p>
      <p className="mt-0.5 truncate text-[10px] font-medium opacity-90">{time}</p>
    </div>
  );
}

function BreakSegmentBlock({ segment, blockStart, blockDuration, compact = false }) {
  const segStart = Math.max(segment.startMinutes, blockStart);
  const segEnd = Math.min(segment.endMinutes, blockStart + blockDuration);
  if (segEnd <= segStart) return null;

  const top = ((segStart - blockStart) / blockDuration) * 100;
  const height = ((segEnd - segStart) / blockDuration) * 100;
  const outerPadding = compact ? "px-1" : "px-1.5";
  const innerPadding = compact ? "px-1 py-0.5" : "px-1.5 py-1";

  return (
    <div
      className={`break-segment absolute inset-x-0 z-20 flex items-stretch ${outerPadding}`}
      style={{ top: `${top}%`, height: `${height}%` }}
      title={`Intervalo · ${segment.label}`}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col justify-center rounded-[5px] border border-white/85 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-[background-color,box-shadow] hover:bg-black/20 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] ${innerPadding}`}
      >
        <span className="truncate text-[10px] font-semibold leading-tight">Intervalo</span>
        <span className="truncate text-[10px] font-medium leading-tight opacity-95">
          {segment.label}
        </span>
      </div>
    </div>
  );
}

function TimelineEventBlock({
  event,
  people,
  dayOccurrences,
  gridMinMinutes,
  gridMaxMinutes,
  gridTopInset = 0,
  onClick,
}) {
  const visible = clipTimelineToGrid(
    event.startMinutes,
    event.endMinutes,
    gridMinMinutes,
    gridMaxMinutes
  );
  if (!visible) return null;

  const color = colorForPerson(event.person.id, people);
  const textColor = chipTextColor(color);
  const top = minutesToTopPx(visible.start, gridMinMinutes) + gridTopInset;
  const height = minutesToHeightPx(visible.start, visible.end);
  const isStacked = Boolean(event.isStacked);
  const stackIndex = event.stackIndex ?? 0;
  const isCompact = isStacked && stackIndex !== (event.stackSize ?? 1) - 1;
  const stackOffset = isStacked ? stackIndex * STACK_STEP_PX : 0;
  const widthPercent = 100 / event.columnCount;
  const leftPercent = event.column * widthPercent;
  const overlapLabel = describePersonScaleOverlap(
    dayOccurrences.filter((occ) => occ.shift === event.shift.id),
    event.person.id
  );
  const blockDuration = visible.end - visible.start;
  const breakSegments = event.segments.filter((segment) => segment.type === "break");

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`absolute flex flex-col overflow-hidden text-left shadow-sm transition-[filter] hover:brightness-110 has-[.break-segment:hover]:brightness-100 ${
        isStacked ? "rounded-[7px] border border-white/90" : "rounded-[6px] border border-black/10"
      }`}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 24)}px`,
        left: isStacked
          ? `${STACK_EDGE_PADDING_PX + stackOffset}px`
          : `calc(${leftPercent}% + ${STACK_EDGE_PADDING_PX}px)`,
        width: isStacked
          ? `calc(100% - ${STACK_EDGE_PADDING_PX * 2 + stackOffset}px)`
          : `calc(${widthPercent}% - ${STACK_EDGE_PADDING_PX * 2}px)`,
        zIndex: isStacked ? 10 + stackIndex : 10,
        backgroundColor: color,
        color: textColor,
      }}
      title={`${event.person.nome} · ${event.shift.time}`}
    >
      {breakSegments.map((segment, index) => (
        <BreakSegmentBlock
          key={`${event.id}-break-${index}`}
          segment={segment}
          blockStart={visible.start}
          blockDuration={blockDuration}
          compact={isCompact}
        />
      ))}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <EventHeader
          compact={isCompact}
          name={event.person.nome}
          time={event.shift.time}
          overlapLabel={overlapLabel}
        />
      </div>
    </button>
  );
}

function CoverageViolationBand({
  segmentStart,
  segmentEnd,
  actualCount,
  requiredCount,
  gridMinMinutes,
  gridMaxMinutes,
  gridTopInset = 0,
}) {
  const visible = clipTimelineToGrid(segmentStart, segmentEnd, gridMinMinutes, gridMaxMinutes);
  if (!visible) return null;

  const top = minutesToTopPx(visible.start, gridMinMinutes) + gridTopInset;
  const height = minutesToHeightPx(visible.start, visible.end);
  const label = `${actualCount}/${requiredCount}`;
  const timeRange = `${formatMinutesToTime(visible.start)} – ${formatMinutesToTime(visible.end)}`;
  const deficit = Math.max(0, requiredCount - actualCount);
  const title = `${timeRange} · ${actualCount} de ${requiredCount} pessoas · faltam ${deficit}`;

  return (
    <div
      className="absolute inset-x-1 z-[30] overflow-hidden rounded-md bg-bad transition-[filter] hover:brightness-110"
      style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
      title={title}
      aria-label={`Cobertura insuficiente: ${timeRange}, ${label}`}
    >
      <div className="flex h-full items-center justify-center px-1.5">
        <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
          {label}
        </span>
      </div>
    </div>
  );
}

function TimeLabel({ minutes, gridMinMinutes }) {
  const top = minutesToTopPx(minutes, gridMinMinutes) + GRID_BODY_TOP_INSET_PX;

  return (
    <span
      className="absolute right-2 block -translate-y-1/2 text-right text-[11px] leading-none tabular-nums text-ink-faint"
      style={{ top }}
    >
      {formatHourLabel(minutes)}
    </span>
  );
}

function ViolationTimeLabel({ minutes, label, gridMinMinutes }) {
  const top = minutesToTopPx(minutes, gridMinMinutes) + GRID_BODY_TOP_INSET_PX;

  return (
    <span
      className="absolute right-2 z-10 block -translate-y-1/2 text-right text-[11px] font-semibold leading-none tabular-nums text-bad"
      style={{ top }}
    >
      {label}
    </span>
  );
}

export default function WeekTimeGrid({
  days,
  occByDate,
  rules,
  shiftsById,
  people,
  holidays,
  todayISO,
  onEventClick,
  coverageViolations = [],
}) {
  const rulesById = Object.fromEntries(rules.map((rule) => [rule.id, rule]));
  const violationsByDate = useMemo(() => {
    const map = {};
    for (const violation of coverageViolations) {
      if (!map[violation.dateISO]) map[violation.dateISO] = [];
      map[violation.dateISO].push(violation);
    }
    return map;
  }, [coverageViolations]);
  const violationBandsByDate = useMemo(() => {
    const map = {};
    for (const [dateISO, dayViolations] of Object.entries(violationsByDate)) {
      map[dateISO] = mergeDayCoverageViolationBands(dayViolations);
    }
    return map;
  }, [violationsByDate]);
  const { minMinutes, maxMinutes } = getGridBounds();
  const violationTimeLabels = useMemo(
    () =>
      buildViolationTimeLabelsForSegments(
        coverageViolations,
        minMinutes,
        maxMinutes,
        clipTimelineToGrid
      ),
    [coverageViolations, minMinutes, maxMinutes]
  );
  const violationMinuteSet = useMemo(
    () => new Set(violationTimeLabels.map((item) => item.minutes)),
    [violationTimeLabels]
  );
  const hourMarks = buildHourMarks(minMinutes, maxMinutes);
  const bodyHeight = gridHeightPx(minMinutes, maxMinutes) + GRID_BODY_TOP_INSET_PX;

  return (
    <Card className="overflow-hidden p-0">
      <div className="week-time-grid export-time-grid overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div
          className="week-time-grid-scroll max-h-[min(960px,calc(100svh-220px))] min-w-[840px] overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]"
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: GRID_COLUMNS,
              gridTemplateRows: `${GRID_HEADER_HEIGHT_PX}px ${bodyHeight}px`,
            }}
          >
            <div
              className="sticky left-0 top-0 z-50 border-b border-r border-border-soft bg-surface"
              style={{ gridColumn: 1, gridRow: 1 }}
            />

            {days.map((day, index) => {
              const iso = toISODate(day);
              const hasViolation = Boolean(violationsByDate[iso]?.length);

              return (
              <div
                key={`header-${iso}`}
                className="sticky top-0 z-40 border-b border-r border-border-soft bg-surface"
                style={{ gridColumn: index + 2, gridRow: 1 }}
              >
                <DayColumnHeader day={day} todayISO={todayISO} hasViolation={hasViolation} />
              </div>
              );
            })}

            <div
              className="sticky left-0 z-30 border-r border-border-soft bg-surface"
              style={{ gridColumn: 1, gridRow: 2, height: bodyHeight }}
            >
              <div className="relative h-full">
                {hourMarks.slice(0, -1).map((minutes) => {
                  if (violationMinuteSet.has(minutes)) return null;
                  return (
                    <TimeLabel key={minutes} minutes={minutes} gridMinMinutes={minMinutes} />
                  );
                })}
                {violationTimeLabels.map(({ minutes, label }) => (
                  <ViolationTimeLabel
                    key={`violation-time-${minutes}-${label}`}
                    minutes={minutes}
                    label={label}
                    gridMinMinutes={minMinutes}
                  />
                ))}
              </div>
            </div>

            {days.map((day, index) => {
              const iso = toISODate(day);
              const dayOccurrences = occByDate[iso] || [];
              const events = buildDayTimelineEventsWithStacks(
                dayOccurrences,
                rulesById,
                shiftsById,
                people,
                holidays
              );

              return (
                <div
                  key={iso}
                  className="relative border-r border-border-soft bg-surface"
                  style={{ gridColumn: index + 2, gridRow: 2, height: bodyHeight }}
                >
                  {hourMarks.map((minutes) => (
                    <div
                      key={`${iso}-${minutes}`}
                      className="pointer-events-none absolute inset-x-0 border-t border-border-soft/70"
                      style={{ top: minutesToTopPx(minutes, minMinutes) + GRID_BODY_TOP_INSET_PX }}
                    />
                  ))}

                  {events.map((event) => (
                    <TimelineEventBlock
                      key={event.id}
                      event={event}
                      people={people}
                      dayOccurrences={dayOccurrences}
                      gridMinMinutes={minMinutes}
                      gridMaxMinutes={maxMinutes}
                      gridTopInset={GRID_BODY_TOP_INSET_PX}
                      onClick={(selected) => onEventClick(day, selected.shift.id)}
                    />
                  ))}

                  {(violationBandsByDate[iso] || []).map((band) => (
                    <CoverageViolationBand
                      key={`${iso}-${band.segmentStart}-${band.segmentEnd}`}
                      segmentStart={band.segmentStart}
                      segmentEnd={band.segmentEnd}
                      actualCount={band.actualCount}
                      requiredCount={band.requiredCount}
                      gridMinMinutes={minMinutes}
                      gridMaxMinutes={maxMinutes}
                      gridTopInset={GRID_BODY_TOP_INSET_PX}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
