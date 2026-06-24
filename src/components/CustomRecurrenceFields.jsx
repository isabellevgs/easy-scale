import { WEEKDAY_LABELS, WEEKDAY_LABELS_FULL } from "../lib/constants";
import { inputClass } from "./ui";
import {
  CUSTOM_END_TYPES,
  CUSTOM_FREQUENCIES,
  FREQUENCY_OPTIONS,
  frequencyLabel,
  getMonthModeOptions,
  normalizeCustomRecurrence,
} from "../lib/customRecurrence";

function NumberStepper({ value, min, max, onChange, disabled = false, className = "" }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className={`${inputClass} shrink-0 px-2 text-center disabled:opacity-50 ${className}`}
    />
  );
}

function RadioRow({ name, checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-brand"
      />
      <span className="flex flex-1 flex-wrap items-center gap-2 text-[14px] text-ink">{children}</span>
    </label>
  );
}

export default function CustomRecurrenceFields({ recurrence, startDate, onChange, onStartDateChange }) {
  const rec = normalizeCustomRecurrence(recurrence, startDate);
  const monthModeOptions = getMonthModeOptions(startDate, WEEKDAY_LABELS_FULL);

  function patchRecurrence(patch) {
    onChange({ ...rec, ...patch });
  }

  function setInterval(value) {
    patchRecurrence({ interval: Math.max(1, Math.min(999, value || 1)) });
  }

  function setFrequency(frequency) {
    patchRecurrence({ frequency });
  }

  function toggleWeekday(day) {
    const current = rec.weekdays || [];
    const next = current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day].sort((a, b) => a - b);
    patchRecurrence({ weekdays: next });
  }

  return (
    <div className="space-y-5 rounded-xl border border-border-soft bg-surface p-4">
      <FieldBlock label="Repetir a cada:">
        <div className="grid grid-cols-2 gap-2">
          <NumberStepper
            value={rec.interval}
            min={1}
            max={999}
            onChange={setInterval}
            className="w-full"
          />
          <select
            className={inputClass}
            value={rec.frequency}
            onChange={(event) => setFrequency(event.target.value)}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {frequencyLabel(option.id, rec.interval)}
              </option>
            ))}
          </select>
        </div>
      </FieldBlock>

      {rec.frequency === CUSTOM_FREQUENCIES.MONTH && monthModeOptions.length > 0 && (
        <FieldBlock label="Repetir:">
          <select
            className={inputClass}
            value={rec.monthMode}
            onChange={(event) => patchRecurrence({ monthMode: event.target.value })}
          >
            {monthModeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldBlock>
      )}

      {rec.frequency === CUSTOM_FREQUENCIES.WEEK && (
        <FieldBlock label="Repetir:">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, index) => {
              const active = rec.weekdays.includes(index);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleWeekday(index)}
                  className={`h-9 w-12 rounded-lg border text-[12px] font-medium transition-colors ${
                    active
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FieldBlock>
      )}

      <FieldBlock label="Data de início">
        <input
          type="date"
          className={inputClass}
          value={startDate || ""}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
      </FieldBlock>

      <FieldBlock label="Termina em">
        <div className="space-y-1">
          <RadioRow
            name="custom-end-type"
            checked={rec.endType === CUSTOM_END_TYPES.NEVER}
            onChange={() => patchRecurrence({ endType: CUSTOM_END_TYPES.NEVER })}
          >
            Nunca
          </RadioRow>

          <RadioRow
            name="custom-end-type"
            checked={rec.endType === CUSTOM_END_TYPES.ON_DATE}
            onChange={() =>
              patchRecurrence({
                endType: CUSTOM_END_TYPES.ON_DATE,
                endDate: rec.endDate || startDate || "",
              })
            }
          >
            <span>Em</span>
            <input
              type="date"
              className={`${inputClass} max-w-[180px]`}
              value={rec.endDate || ""}
              min={startDate || undefined}
              disabled={rec.endType !== CUSTOM_END_TYPES.ON_DATE}
              onChange={(event) => patchRecurrence({ endDate: event.target.value })}
            />
          </RadioRow>

          <RadioRow
            name="custom-end-type"
            checked={rec.endType === CUSTOM_END_TYPES.AFTER_COUNT}
            onChange={() => patchRecurrence({ endType: CUSTOM_END_TYPES.AFTER_COUNT })}
          >
            <span>Após</span>
            <NumberStepper
              value={rec.occurrenceCount}
              min={1}
              max={999}
              disabled={rec.endType !== CUSTOM_END_TYPES.AFTER_COUNT}
              className="max-w-[72px]"
              onChange={(value) => patchRecurrence({ occurrenceCount: value })}
            />
            <span className="text-ink-soft">ocorrências</span>
          </RadioRow>
        </div>
      </FieldBlock>
    </div>
  );
}

function FieldBlock({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-ink-soft">{label}</p>
      {children}
    </div>
  );
}
