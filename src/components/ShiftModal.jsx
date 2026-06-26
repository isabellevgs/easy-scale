import { useState } from "react";
import { Button, Field, inputClass, Modal } from "./ui";
import { WEEKDAY_LABELS } from "../lib/constants";
import { createEmptyShift, validateShiftWeekdayConfig } from "../lib/shifts";

function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function ShiftModal({ open, initial, onClose, onSave }) {
  const resetKey = `${open}-${initial?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(resetKey);
  const [form, setForm] = useState(() => initial || createEmptyShift());
  const [error, setError] = useState("");

  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setForm(initial || createEmptyShift());
    setError("");
  }

  const isEdit = Boolean(initial?.id);

  function toggleWeekday(day) {
    setForm((current) => {
      const selected = current.weekdays.includes(day)
        ? current.weekdays.filter((item) => item !== day)
        : [...current.weekdays, day].sort((a, b) => a - b);
      return { ...current, weekdays: selected };
    });
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const label = form.label.trim();
    if (!label) {
      setError("Informe o nome do turno.");
      return;
    }
    if (!isValidTime(form.start) || !isValidTime(form.end)) {
      setError("Informe horários válidos.");
      return;
    }

    const weekdayValidation = validateShiftWeekdayConfig(form.weekdays, form.appliesOnHolidays);
    if (!weekdayValidation.ok) {
      setError(weekdayValidation.error);
      return;
    }

    onSave({
      label,
      start: form.start,
      end: form.end,
      weekdays: weekdayValidation.weekdays,
      appliesOnHolidays: weekdayValidation.appliesOnHolidays,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar turno" : "Novo turno"}>
      <form onSubmit={handleSubmit}>
        <Field label="Nome do turno">
          <input
            type="text"
            className={inputClass}
            value={form.label}
            onChange={(e) => {
              setForm((current) => ({ ...current, label: e.target.value }));
              setError("");
            }}
            placeholder="Ex.: Manhã, Plantão noturno..."
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Início">
            <input
              type="time"
              className={inputClass}
              value={form.start}
              onChange={(e) => setForm((current) => ({ ...current, start: e.target.value }))}
            />
          </Field>
          <Field label="Fim">
            <input
              type="time"
              className={inputClass}
              value={form.end}
              onChange={(e) => setForm((current) => ({ ...current, end: e.target.value }))}
            />
          </Field>
        </div>

        <Field
          label="Aplica-se a"
          hint="Define em quais dias o turno aparece nas visualizações e na necessidade de pessoas."
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {WEEKDAY_LABELS.map((dayLabel, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(day)}
                className={`rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors ${
                  form.weekdays.includes(day)
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border text-ink-soft hover:bg-surface-2"
                }`}
              >
                {dayLabel}
              </button>
            ))}
          </div>

          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-border-soft px-3.5 py-3 transition-colors hover:bg-surface-2">
            <input
              type="checkbox"
              className="accent-brand"
              checked={form.appliesOnHolidays}
              onChange={(e) => {
                setForm((current) => ({ ...current, appliesOnHolidays: e.target.checked }));
                setError("");
              }}
            />
            <span className="text-[14px] text-ink">Incluir feriados cadastrados</span>
          </label>
        </Field>

        {error && <p className="mb-3 text-[13px] text-bad">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{isEdit ? "Salvar" : "Criar turno"}</Button>
        </div>
      </form>
    </Modal>
  );
}
