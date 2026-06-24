import { useEffect, useMemo, useState } from "react";
import { Button, Field, Modal, inputClass } from "./ui";
import { WEEKDAY_LABELS } from "../lib/constants";
import { applyPersonShiftRecurrence, getPersonShiftRuleOnDate } from "../lib/scheduleToggle";
import { usePersist } from "../hooks/usePersist";
import { useShifts } from "../hooks/useShifts";

const RECURRENCE_TYPES = [
  { id: "specific_date", label: "Só este dia" },
  { id: "weekly", label: "Semanal" },
];

function getWeekday(dateISO) {
  return new Date(`${dateISO}T00:00:00`).getDay();
}

function buildForm(rule, dateISO) {
  const weekday = getWeekday(dateISO);
  if (rule?.recurrence?.type === "weekly") {
    return {
      type: "weekly",
      weekdays: rule.recurrence.weekdays?.length ? [...rule.recurrence.weekdays] : [weekday],
      endDate: rule.endDate || "",
    };
  }
  return {
    type: "specific_date",
    weekdays: [weekday],
    endDate: "",
  };
}

export default function ShiftRecurrenceModal({
  open,
  onClose,
  person,
  shift,
  dateISO,
  dateLabel,
  rules,
  holidays,
  addRule,
  updateRule,
  removeRule,
}) {
  const { shiftsById } = useShifts();
  const { persist } = usePersist();
  const rule = useMemo(() => {
    if (!open || !person || !shift || !dateISO) return null;
    return getPersonShiftRuleOnDate(
      rules,
      { personId: person.id, shiftId: shift.id, dateISO },
      holidays
    );
  }, [open, person, shift, dateISO, rules, holidays]);

  const [form, setForm] = useState(() => buildForm(rule, dateISO));

  useEffect(() => {
    if (!open) return;
    setForm(buildForm(rule, dateISO));
  }, [open, rule, dateISO]);

  if (!person || !shift) return null;

  const isValid =
    form.type === "specific_date" || (form.type === "weekly" && form.weekdays.length > 0);

  function toggleWeekday(day) {
    setForm((current) => {
      const next = current.weekdays.includes(day)
        ? current.weekdays.filter((item) => item !== day)
        : [...current.weekdays, day];
      return { ...current, weekdays: next };
    });
  }

  function handleSave(event) {
    event.preventDefault();
    if (!isValid || !dateISO) return;

    persist(
      () =>
        applyPersonShiftRecurrence(
          { rules, addRule, updateRule, removeRule, holidays, shiftsById },
          {
            personId: person.id,
            shiftId: shift.id,
            dateISO,
            recurrenceType: form.type,
            weekdays: form.weekdays,
            endDate: form.endDate,
          }
        ),
      "Recorrência salva.",
      "Não foi possível salvar a recorrência."
    ).then((result) => {
      if (result?.ok) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Recorrência · ${person.nome}`}
      width="max-w-md"
    >
      <p className="mb-4 text-[13px] text-ink-soft">
        {shift.label} · {dateLabel}
      </p>

      <form onSubmit={handleSave}>
        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {RECURRENCE_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    type: type.id,
                    weekdays:
                      type.id === "weekly" && current.weekdays.length === 0
                        ? [getWeekday(dateISO)]
                        : current.weekdays,
                  }))
                }
                className={`rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  form.type === type.id
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border text-ink-soft hover:bg-surface-2"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </Field>

        {form.type === "weekly" && (
          <>
            <Field label="Dias da semana">
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, index) => {
                  const active = form.weekdays.includes(index);
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
            </Field>

            <Field label="Fim (opcional)" hint="Vazio = sem data de término">
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </Field>
          </>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-border-soft pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isValid}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
