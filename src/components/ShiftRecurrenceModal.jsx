import { useEffect, useMemo, useState } from "react";
import { Button, Field, Modal, ClearableDateInput, inputClass } from "./ui";
import { WEEKDAY_LABELS } from "../lib/constants";
import { applyPersonShiftRecurrence, getPersonShiftRuleOnDate } from "../lib/scheduleToggle";
import { usePersist } from "../hooks/usePersist";
import { useShifts } from "../hooks/useShifts";
import { SCALE_TYPE_OPTIONS, normalizeScaleType, SCALE_TYPES } from "../lib/rules";
import DateMultiPicker from "./DateMultiPicker";
import CustomRecurrenceFields from "./CustomRecurrenceFields";
import { emptyCustomRecurrence, isValidCustomRecurrence } from "../lib/customRecurrence";

const RECURRENCE_TYPES = [
  { id: "specific_date", label: "Dia específico" },
  { id: "specific_dates", label: "Selecionar dias" },
  { id: "weekly", label: "Semanal" },
  { id: "custom", label: "Personalizada" },
];

function getWeekday(dateISO) {
  return new Date(`${dateISO}T00:00:00`).getDay();
}

function buildForm(rule, dateISO) {
  const weekday = getWeekday(dateISO);

  if (!rule) {
    return {
      scaleType: SCALE_TYPES.REGULAR,
      startDate: dateISO,
      endDate: "",
      recurrence: { type: "specific_date", date: dateISO },
    };
  }

  const rec = rule.recurrence || { type: "specific_date", date: dateISO };

  if (rec.type === "weekly") {
    return {
      scaleType: normalizeScaleType(rule.scaleType),
      startDate: rule.startDate || "",
      endDate: rule.endDate || "",
      recurrence: {
        type: "weekly",
        weekdays: rec.weekdays?.length ? [...rec.weekdays] : [weekday],
      },
    };
  }

  if (rec.type === "specific_dates") {
    const dates = rec.dates?.length ? [...rec.dates] : [dateISO];
    return {
      scaleType: normalizeScaleType(rule.scaleType),
      startDate: "",
      endDate: "",
      recurrence: { type: "specific_dates", dates },
    };
  }

  if (rec.type === "custom") {
    return {
      scaleType: normalizeScaleType(rule.scaleType),
      startDate: rule.startDate || dateISO,
      endDate: rule.endDate || "",
      recurrence: { ...rec },
    };
  }

  return {
    scaleType: normalizeScaleType(rule.scaleType),
    startDate: "",
    endDate: "",
    recurrence: {
      type: "specific_date",
      date: rec.type === "specific_date" && rec.date ? rec.date : dateISO,
    },
  };
}

function buildRulePayload(form, dateISO) {
  const rec = form.recurrence;
  const scaleType = normalizeScaleType(form.scaleType);

  if (rec.type === "specific_date") {
    return {
      scaleType,
      startDate: "",
      endDate: "",
      recurrence: { type: "specific_date", date: rec.date || dateISO },
    };
  }

  if (rec.type === "specific_dates") {
    const dates = (rec.dates || []).length ? rec.dates : [dateISO];
    return {
      scaleType,
      startDate: "",
      endDate: "",
      recurrence: { type: "specific_dates", dates },
    };
  }

  if (rec.type === "weekly") {
    return {
      scaleType,
      startDate: form.startDate || "",
      endDate: form.endDate || "",
      recurrence: { type: "weekly", weekdays: rec.weekdays || [getWeekday(dateISO)] },
    };
  }

  if (rec.type === "custom") {
    return {
      scaleType,
      startDate: form.startDate || dateISO,
      endDate: rec.endType === "on_date" ? rec.endDate : "",
      recurrence: rec,
    };
  }

  return { scaleType, startDate: "", endDate: "", recurrence: rec };
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

  const rec = form.recurrence;
  const scaleType = normalizeScaleType(form.scaleType);

  const isValid =
    (rec.type !== "specific_date" || rec.date) &&
    (rec.type !== "specific_dates" || (rec.dates || []).length > 0) &&
    (rec.type !== "weekly" || (rec.weekdays || []).length > 0) &&
    (rec.type !== "custom" || isValidCustomRecurrence(rec, form.startDate || dateISO));

  function setRecType(type) {
    if (type === "custom") {
      const startDate = form.startDate || dateISO;
      setForm((current) => ({
        ...current,
        startDate,
        endDate: "",
        recurrence: emptyCustomRecurrence(startDate),
      }));
      return;
    }

    const base = { type };
    if (type === "weekly") base.weekdays = [getWeekday(dateISO)];
    if (type === "specific_date") base.date = dateISO;
    if (type === "specific_dates") base.dates = [dateISO];

    setForm((current) => ({
      ...current,
      recurrence: base,
      startDate: "",
      endDate: "",
    }));
  }

  function toggleWeekday(day) {
    setForm((current) => {
      const weekdays = current.recurrence.weekdays || [];
      const next = weekdays.includes(day)
        ? weekdays.filter((item) => item !== day)
        : [...weekdays, day];
      return { ...current, recurrence: { ...current.recurrence, weekdays: next } };
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
            rulePayload: buildRulePayload(form, dateISO),
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
      width="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="shift-recurrence-form" disabled={!isValid}>
            Salvar
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-[13px] text-ink-soft">
        {shift.label} · {dateLabel}
      </p>

      <form id="shift-recurrence-form" onSubmit={handleSave}>
        <div className="flex flex-col gap-4 pb-2 [&>div]:!mb-0">
          <Field
            label="Tipo de escala"
            hint={
              scaleType === SCALE_TYPES.OVERTIME
                ? "Hora extra não entra nas regras de inconsistência, mas conta na necessidade de pessoas."
                : scaleType === SCALE_TYPES.PLANTAO
                  ? "Plantão não entra nas regras de inconsistência, mas conta na necessidade de pessoas."
                  : "Escala regular entra nas regras de inconsistência e na necessidade de pessoas."
            }
          >
            <div className="grid grid-cols-3 gap-2">
              {SCALE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, scaleType: option.id }))}
                  className={`rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    scaleType === option.id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tipo de recorrência">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RECURRENCE_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setRecType(type.id)}
                  className={`rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    rec.type === type.id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </Field>

          {rec.type === "specific_date" && (
            <Field label="Data">
              <input
                type="date"
                className={inputClass}
                value={rec.date || dateISO}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    recurrence: { ...current.recurrence, date: event.target.value },
                  }))
                }
              />
            </Field>
          )}

          {rec.type === "specific_dates" && (
            <Field
              label="Datas"
              hint="Clique nos dias do calendário para selecionar ou remover."
            >
              <DateMultiPicker
                selectedDates={rec.dates || [dateISO]}
                onChange={(dates) =>
                  setForm((current) => ({
                    ...current,
                    recurrence: { ...current.recurrence, dates },
                  }))
                }
              />
            </Field>
          )}

          {rec.type === "weekly" && (
            <>
              <Field label="Dias da semana">
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, index) => {
                    const active = (rec.weekdays || []).includes(index);
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="Início (opcional)" hint="Vazio = vale em todo o período visível">
                  <ClearableDateInput
                    value={form.startDate || ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startDate: event.target.value }))
                    }
                    clearLabel="Limpar data de início"
                  />
                </Field>
                <Field label="Fim (opcional)" hint="Vazio = sem data de término">
                  <ClearableDateInput
                    value={form.endDate || ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, endDate: event.target.value }))
                    }
                    clearLabel="Limpar data de fim"
                  />
                </Field>
              </div>
            </>
          )}

          {rec.type === "custom" && (
            <Field label="Recorrência personalizada">
              <CustomRecurrenceFields
                recurrence={rec}
                startDate={form.startDate || dateISO}
                onChange={(nextRecurrence) =>
                  setForm((current) => ({ ...current, recurrence: nextRecurrence }))
                }
                onStartDateChange={(startDate) =>
                  setForm((current) => ({ ...current, startDate }))
                }
              />
            </Field>
          )}
        </div>
      </form>
    </Modal>
  );
}
