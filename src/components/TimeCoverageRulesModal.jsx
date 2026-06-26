import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button, Modal, Field, inputClass, IconButton } from "./ui";
import { uid } from "../lib/storage";
import { WEEKDAY_LABELS } from "../lib/constants";
import {
  createTimeCoverageRule,
  describeTimeCoverageRule,
  normalizeTimeCoverageRules,
} from "../lib/timeCoverageRules";
import { isValidTime } from "../lib/ruleInterval";

function RuleItem({
  rule,
  open,
  isFirst,
  isLast,
  onToggle,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const weekdays = rule.weekdays || [];
  const isValid =
    isValidTime(rule.timeStart) &&
    isValidTime(rule.timeEnd) &&
    rule.timeStart !== rule.timeEnd &&
    Number(rule.requiredCount) >= 1;

  function toggleWeekday(dayIndex) {
    const next = weekdays.includes(dayIndex)
      ? weekdays.filter((day) => day !== dayIndex)
      : [...weekdays, dayIndex].sort((a, b) => a - b);
    onUpdate({ weekdays: next });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-soft bg-surface">
      <div className="flex items-stretch gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex shrink-0 flex-col justify-center gap-0.5">
          <IconButton
            type="button"
            className="h-8 w-8"
            disabled={isFirst}
            aria-label="Mover regra para cima"
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
          >
            <ChevronUp className="h-4 w-4" />
          </IconButton>
          <IconButton
            type="button"
            className="h-8 w-8"
            disabled={isLast}
            aria-label="Mover regra para baixo"
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </IconButton>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-[13px] font-medium text-ink">
            {rule.label?.trim() || describeTimeCoverageRule(rule)}
          </p>
          {rule.label?.trim() && (
            <p className="mt-0.5 text-[12px] text-ink-soft">{describeTimeCoverageRule(rule)}</p>
          )}
        </button>

        <IconButton
          type="button"
          className="h-8 w-8 shrink-0 self-center"
          aria-label={open ? "Recolher regra" : "Expandir regra"}
          onClick={onToggle}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </IconButton>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border-soft px-4 py-4">
          <Field
            label="Dias da semana"
            hint="Vazio = vale em todos os dias visíveis na grade."
          >
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, index) => {
                const active = weekdays.includes(index);
                return (
                  <button
                    key={index}
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
            <Field label="Início">
              <input
                type="time"
                className={inputClass}
                value={rule.timeStart || ""}
                onChange={(event) => onUpdate({ timeStart: event.target.value })}
                required
              />
            </Field>
            <Field label="Fim">
              <input
                type="time"
                className={inputClass}
                value={rule.timeEnd || ""}
                onChange={(event) => onUpdate({ timeEnd: event.target.value })}
                required
              />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[13px] font-medium text-ink">Pessoas:</span>
            <input
              type="number"
              min={1}
              max={99}
              className={`${inputClass} w-20`}
              value={rule.requiredCount ?? 1}
              onChange={(event) =>
                onUpdate({ requiredCount: Math.max(1, Number(event.target.value) || 1) })
              }
              required
              aria-label="Quantidade de pessoas necessárias"
            />
          </div>

          <Field label="Nome (opcional)" hint="Ajuda a identificar a regra na lista.">
            <input
              type="text"
              className={inputClass}
              value={rule.label || ""}
              placeholder="Ex.: Pico da manhã"
              onChange={(event) => onUpdate({ label: event.target.value })}
            />
          </Field>

          {!isValid && (
            <p className="text-[12px] text-bad">
              Informe início e fim do horário e pelo menos 1 pessoa necessária.
            </p>
          )}

          <div className="flex justify-end border-t border-border-soft pt-4">
            <Button type="button" variant="danger" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
              Excluir regra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimeCoverageRulesModal({
  open,
  onClose,
  timeCoverageRules,
  showViolationsOnGrid = true,
  onSaveRules,
}) {
  const [draft, setDraft] = useState(() => normalizeTimeCoverageRules(timeCoverageRules));
  const [showOnGrid, setShowOnGrid] = useState(showViolationsOnGrid);
  const [openRules, setOpenRules] = useState(() => new Set());

  const resetKey = `${open}-${JSON.stringify(timeCoverageRules)}-${showViolationsOnGrid}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setDraft(normalizeTimeCoverageRules(timeCoverageRules));
    setShowOnGrid(showViolationsOnGrid);
    setOpenRules(new Set());
  }

  function toggleRule(ruleId) {
    setOpenRules((current) => {
      const next = new Set(current);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  }

  function updateRule(ruleId, patch) {
    setDraft((current) =>
      current.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule))
    );
  }

  function removeRule(ruleId) {
    setDraft((current) => current.filter((rule) => rule.id !== ruleId));
    setOpenRules((current) => {
      const next = new Set(current);
      next.delete(ruleId);
      return next;
    });
  }

  function moveRule(ruleId, direction) {
    setDraft((current) => {
      const index = current.findIndex((rule) => rule.id === ruleId);
      if (index < 0) return current;

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function addRule() {
    const rule = createTimeCoverageRule(uid("tcr"));
    setDraft((current) => [...current, rule]);
    setOpenRules((current) => new Set([...current, rule.id]));
  }

  const canSave = draft.every(
    (rule) =>
      isValidTime(rule.timeStart) &&
      isValidTime(rule.timeEnd) &&
      rule.timeStart !== rule.timeEnd &&
      Number(rule.requiredCount) >= 1
  );

  function handleSave() {
    if (!canSave) return;
    onSaveRules({ rules: draft, showViolationsOnGrid: showOnGrid });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Regras de horário"
      width="max-w-xl"
      contentClassName="py-2 pr-3"
      footerClassName="mt-5 pt-5"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            Salvar regras
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-6">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Defina faixas de horário e quantas pessoas precisam estar trabalhando. Intervalos de
          descanso não contam. A verificação usa a escala visível na semana atual.
        </p>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-soft px-3.5 py-3 transition-colors hover:bg-surface-2">
          <input
            type="checkbox"
            className="accent-brand"
            checked={showOnGrid}
            onChange={(event) => setShowOnGrid(event.target.checked)}
          />
          <span className="text-[14px] text-ink">Mostrar regras quebradas na tabela</span>
        </label>

        <Button type="button" variant="secondary" onClick={addRule}>
          <Plus className="h-4 w-4" />
          Nova regra
        </Button>

        {draft.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-soft px-5 py-10 text-center text-[13px] leading-relaxed text-ink-soft">
            Nenhuma regra cadastrada. Adicione a primeira para monitorar cobertura por horário.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.map((rule, index) => (
              <RuleItem
                key={rule.id}
                rule={rule}
                open={openRules.has(rule.id)}
                isFirst={index === 0}
                isLast={index === draft.length - 1}
                onToggle={() => toggleRule(rule.id)}
                onUpdate={(patch) => updateRule(rule.id, patch)}
                onRemove={() => removeRule(rule.id)}
                onMoveUp={() => moveRule(rule.id, -1)}
                onMoveDown={() => moveRule(rule.id, 1)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
