import { useState } from "react";
import { Button, Modal, Field, inputClass } from "./ui";
import { WEEKDAY_LABELS } from "../lib/constants";
import { useShifts } from "../hooks/useShifts";
import { emptyRule, SCALE_TYPE_OPTIONS, normalizeScaleType } from "../lib/rules";
import { toISODate } from "../lib/schedule";
import DateMultiPicker from "./DateMultiPicker";
import CustomRecurrenceFields from "./CustomRecurrenceFields";
import { emptyCustomRecurrence, isValidCustomRecurrence } from "../lib/customRecurrence";

const RECURRENCE_TYPES = [
  { id: "specific_date", label: "Dia específico" },
  { id: "specific_dates", label: "Selecionar dias" },
  { id: "weekly", label: "Semanal" },
  { id: "custom", label: "Personalizada" },
];

function todayISO() {
  return toISODate(new Date());
}

export default function RuleModal({ open, people, initial, onClose, onSave }) {
  const { shifts } = useShifts();
  const [form, setForm] = useState(() => initial || emptyRule());

  const resetKey = `${open}-${initial?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setForm(initial || emptyRule());
  }

  const rec = form.recurrence;
  const scaleType = normalizeScaleType(form.scaleType);
  const isOvertime = scaleType === "overtime";

  function setRecType(type) {
    const base = { type };
    if (type === "weekly") base.weekdays = [];
    if (type === "specific_date") base.date = form.startDate || todayISO();
    if (type === "specific_dates") base.dates = [];
    if (type === "custom") {
      const startDate = form.startDate || todayISO();
      setForm((f) => ({
        ...f,
        startDate,
        endDate: "",
        recurrence: emptyCustomRecurrence(startDate),
      }));
      return;
    }
    setForm((f) => ({ ...f, recurrence: base, startDate: "", endDate: "" }));
  }

  function toggleWeekday(w) {
    setForm((f) => {
      const current = f.recurrence.weekdays || [];
      const next = current.includes(w) ? current.filter((d) => d !== w) : [...current, w];
      return { ...f, recurrence: { ...f.recurrence, weekdays: next } };
    });
  }

  function toggleShift(shiftId) {
    setForm((f) => {
      const shift = shifts.find((item) => item.id === shiftId);
      const isWeekendShift = shift?.scope === "weekend";
      const current = f.shifts;

      if (isWeekendShift) {
        const next = current.includes(shiftId)
          ? current.filter((id) => id !== shiftId)
          : [...current, shiftId];
        return { ...f, shifts: next };
      }

      const isOnlySelected = current.length === 1 && current[0] === shiftId;
      if (isOnlySelected) {
        return { ...f, shifts: current.filter((id) => id !== shiftId) };
      }

      const weekendIds = current.filter(
        (id) => shifts.find((item) => item.id === id)?.scope === "weekend"
      );
      return { ...f, shifts: [...weekendIds, shiftId] };
    });
  }

  const isValid =
    form.personId &&
    form.shifts.length > 0 &&
    (rec.type !== "specific_date" || rec.date) &&
    (rec.type !== "specific_dates" || (rec.dates || []).length > 0) &&
    (rec.type !== "weekly" || (rec.weekdays || []).length > 0) &&
    (rec.type !== "custom" || isValidCustomRecurrence(rec, form.startDate));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Editar escala" : "Nova escala"}
      width="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="rule-form" disabled={!isValid}>
            Salvar escala
          </Button>
        </div>
      }
    >
      <form
        id="rule-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isValid) return;
          const payload =
            rec.type === "specific_date" || rec.type === "specific_dates"
              ? { ...form, scaleType, startDate: "", endDate: "" }
              : rec.type === "weekly"
                ? { ...form, scaleType, startDate: "" }
                : rec.type === "custom"
                  ? {
                      ...form,
                      scaleType,
                      endDate: rec.endType === "on_date" ? rec.endDate : "",
                      recurrence: rec,
                    }
                  : { ...form, scaleType };
          onSave(payload);
        }}
      >
        <div className="flex flex-col gap-4 pb-2 [&>div]:!mb-0">
          <Field label="Pessoa">
            <select
              className={inputClass}
              value={form.personId}
              onChange={(e) => setForm((f) => ({ ...f, personId: e.target.value }))}
              required
            >
              <option value="">Selecione uma pessoa</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Tipo de escala"
            hint={
              isOvertime
                ? "Hora extra não entra nas regras de inconsistência, mas conta na necessidade de pessoas."
                : "Escala regular entra nas regras de inconsistência e na necessidade de pessoas."
            }
          >
            <div className="grid grid-cols-2 gap-2">
              {SCALE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, scaleType: option.id }))}
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

          <Field
            label="Turno"
            hint={
              isOvertime
                ? "Hora extra pode coexistir com outro turno regular no mesmo dia útil."
                : "Turnos de seg–sex: um por escala. Sábado, domingo e feriados: pode selecionar mais de um."
            }
          >
            <div className="grid grid-cols-3 gap-2">
              {shifts.map((s) => {
                const active = form.shifts.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleShift(s.id)}
                    className="rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors"
                    style={
                      active
                        ? { borderColor: s.color, background: s.soft, color: s.color }
                        : { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" }
                    }
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Tipo de recorrência">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RECURRENCE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRecType(t.id)}
                  className={`rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    rec.type === t.id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {rec.type === "specific_date" && (
            <Field
              label="Data"
              hint="Datas passadas ficam em Escalas passadas e continuam visíveis no calendário."
            >
              <input
                type="date"
                className={inputClass}
                value={rec.date || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recurrence: { ...f.recurrence, date: e.target.value } }))
                }
              />
            </Field>
          )}

          {rec.type === "specific_dates" && (
            <Field
              label="Datas"
              hint="Clique nos dias do calendário para selecionar ou remover. Datas passadas ficam em Escalas passadas."
            >
              <DateMultiPicker
                selectedDates={rec.dates || []}
                onChange={(dates) =>
                  setForm((f) => ({ ...f, recurrence: { ...f.recurrence, dates } }))
                }
              />
            </Field>
          )}

          {rec.type === "weekly" && (
            <Field label="Dias da semana">
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, idx) => {
                  const active = (rec.weekdays || []).includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
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
          )}

          {rec.type === "custom" && (
            <Field label="Recorrência personalizada">
              <CustomRecurrenceFields
                recurrence={rec}
                startDate={form.startDate || todayISO()}
                onChange={(nextRecurrence) =>
                  setForm((f) => ({ ...f, recurrence: nextRecurrence }))
                }
                onStartDateChange={(startDate) => setForm((f) => ({ ...f, startDate }))}
              />
            </Field>
          )}

          {rec.type !== "specific_date" &&
            rec.type !== "specific_dates" &&
            rec.type !== "weekly" &&
            rec.type !== "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início (opcional)" hint="Vazio = vale em todo o período visível">
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </Field>
              <Field label="Fim (opcional)" hint="Vazio = sem data de término">
                <input
                  type="date"
                  className={inputClass}
                  value={form.endDate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </Field>
            </div>
          )}

          {rec.type === "weekly" && (
            <Field label="Fim (opcional)" hint="Vazio = sem data de término">
              <input
                type="date"
                className={inputClass}
                value={form.endDate || ""}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </Field>
          )}
        </div>
      </form>
    </Modal>
  );
}
