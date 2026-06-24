import { useState } from "react";
import { Button, Field, inputClass, Modal } from "./ui";
import { SHIFT_SCOPES, createEmptyShift } from "../lib/shifts";

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

    onSave({
      label,
      start: form.start,
      end: form.end,
      scope: form.scope,
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

        <Field label="Aplica-se a" hint="Define em quais dias a meta de pessoas pode ser configurada.">
          <div className="space-y-2">
            {Object.values(SHIFT_SCOPES).map((scope) => (
              <label
                key={scope.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  form.scope === scope.id
                    ? "border-brand/50 bg-brand-soft"
                    : "border-border-soft bg-surface hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  name="shift-scope"
                  className="accent-brand"
                  checked={form.scope === scope.id}
                  onChange={() => setForm((current) => ({ ...current, scope: scope.id }))}
                />
                <span className="text-[14px] text-ink">{scope.label}</span>
              </label>
            ))}
          </div>
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
