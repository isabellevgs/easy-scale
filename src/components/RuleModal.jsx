import { useState } from "react";
import { Button, Modal, Field, inputClass } from "./ui";
import { WEEKDAY_LABELS } from "../lib/constants";
import { useShifts } from "../hooks/useShifts";
import { emptyRule } from "../lib/rules";
import { toISODate } from "../lib/schedule";

const RECURRENCE_TYPES = [
  { id: "specific_date", label: "Dia específico" },
  { id: "weekly", label: "Semanal" },
];

function todayISO() {
  return toISODate(new Date());
}

export default function RuleModal({ open, people, initial, onClose, onSave }) {
  const { shifts } = useShifts();
  const [form, setForm] = useState(() => initial || emptyRule(people[0]?.id));

  const resetKey = `${open}-${initial?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setForm(initial || emptyRule(people[0]?.id));
  }

  const rec = form.recurrence;

  function setRecType(type) {
    const base = { type };
    if (type === "weekly") base.weekdays = [];
    if (type === "specific_date") base.date = form.startDate || todayISO();
    setForm((f) => ({ ...f, recurrence: base }));
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
      const isOnlySelected = f.shifts.length === 1 && f.shifts[0] === shiftId;
      return { ...f, shifts: isOnlySelected ? [] : [shiftId] };
    });
  }

  const isValid =
    form.personId &&
    form.shifts.length > 0 &&
    (rec.type !== "specific_date" || rec.date) &&
    (rec.type !== "weekly" || (rec.weekdays || []).length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Editar escala" : "Nova escala"}
      width="max-w-lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isValid) return;
          const payload =
            rec.type === "specific_date"
              ? { ...form, startDate: "", endDate: "" }
              : form;
          onSave(payload);
        }}
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <Field label="Pessoa">
            <select
              className={inputClass}
              value={form.personId}
              onChange={(e) => setForm((f) => ({ ...f, personId: e.target.value }))}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Turno" hint="Em dias úteis (seg–sex), uma pessoa só pode ter um turno por dia.">
            <div className="flex flex-wrap gap-2">
              {shifts.map((s) => {
                const active = form.shifts.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleShift(s.id)}
                    className="flex-1 rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors"
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
            <div className="grid grid-cols-2 gap-2">
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

          {rec.type !== "specific_date" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início">
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
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border-soft pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isValid}>
            Salvar escala
          </Button>
        </div>
      </form>
    </Modal>
  );
}
