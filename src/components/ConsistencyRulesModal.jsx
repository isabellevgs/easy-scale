import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button, Modal, PersonAvatar, inputClass, IconButton } from "./ui";
import { useShifts } from "../hooks/useShifts";
import { uid } from "../lib/storage";
import {
  CONSISTENCY_RULE_TEMPLATES,
  CONSISTENCY_RULE_TYPES,
  createConsistencyRule,
  describeConsistencyRule,
  normalizeConsistencyRules,
} from "../lib/consistencyRules";
import ConsistencyRuleTitle from "./ConsistencyRuleTitle";
import { colorForPerson, sortPeopleByName } from "../lib/constants";

function PersonToggle({ person, people, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-surface-3 ${
        active ? "bg-brand-soft/40 text-ink" : "text-ink-soft"
      }`}
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
          active ? "border-brand bg-brand text-base" : "border-border bg-surface-3"
        }`}
      >
        {active && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <PersonAvatar
        nome={person.nome}
        color={colorForPerson(person.id, people)}
        size={22}
      />
      <span className="truncate">{person.nome}</span>
    </button>
  );
}

function assignedPeopleLabel(assignedIds, people) {
  if (!assignedIds.length) return "Pessoas: Nenhuma";

  const names = sortPeopleByName(
    assignedIds.map((id) => people.find((person) => person.id === id)).filter(Boolean)
  ).map((person) => person.nome);

  return `Pessoas: ${names.join(", ")}`;
}

function RuleAccordionItem({
  rule,
  itemRef,
  people,
  sortedPeople,
  shifts,
  shiftsById,
  open,
  isFirst,
  isLast,
  onToggle,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const meta = describeConsistencyRule(rule, shiftsById);
  const needsShift = rule.type !== CONSISTENCY_RULE_TYPES.DAYS_OFF_PER_WEEK;

  return (
    <div
      ref={itemRef}
      className="scroll-mt-4 overflow-hidden rounded-xl border border-border-soft bg-surface"
    >
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
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-surface-2 sm:px-2"
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="text-[14px] font-semibold leading-snug text-ink">
              <ConsistencyRuleTitle rule={rule} shiftsById={shiftsById} />
            </h3>
            {!open && (
              <>
                <p className="text-[12px] leading-relaxed text-ink-soft">{meta.description}</p>
                <p className="text-[12px] leading-relaxed text-ink">
                  {assignedPeopleLabel(rule.personIds, people)}
                </p>
              </>
            )}
          </div>
          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-border-soft bg-surface-2/30 px-4 py-5 sm:px-5">
          <div className="max-w-sm">
            {needsShift ? (
              <label className="block text-[12px] text-ink-soft">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Turno
                </span>
                <select
                  className={inputClass}
                  value={rule.shiftId || ""}
                  onChange={(event) => onUpdate({ shiftId: event.target.value })}
                >
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block text-[12px] text-ink-soft">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Quantidade de folgas
                </span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  className={inputClass}
                  value={rule.expectedCount}
                  onChange={(event) =>
                    onUpdate({
                      expectedCount: Math.max(
                        1,
                        Math.min(7, Number.parseInt(event.target.value, 10) || 1)
                      ),
                    })
                  }
                />
              </label>
            )}
          </div>

          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Pessoas vinculadas
            </p>
            {sortedPeople.length === 0 ? (
              <p className="text-[12px] text-ink-faint">Cadastre pessoas na equipe primeiro.</p>
            ) : (
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border-soft bg-surface p-1.5">
                {sortedPeople.map((person) => (
                  <PersonToggle
                    key={person.id}
                    person={person}
                    people={people}
                    active={rule.personIds.includes(person.id)}
                    onToggle={() => {
                      const next = rule.personIds.includes(person.id)
                        ? rule.personIds.filter((id) => id !== person.id)
                        : [...rule.personIds, person.id];
                      onUpdate({ personIds: next });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

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

export default function ConsistencyRulesModal({
  open,
  onClose,
  people,
  consistencyRules,
  onSaveRules,
}) {
  const { shifts, shiftsById } = useShifts();
  const shiftIds = shifts.map((shift) => shift.id);
  const [draft, setDraft] = useState(() => normalizeConsistencyRules(consistencyRules, shiftIds));
  const [openRules, setOpenRules] = useState(() => new Set());
  const [scrollTargetId, setScrollTargetId] = useState(null);
  const ruleRefs = useRef({});

  useEffect(() => {
    if (!scrollTargetId) return;

    const element = ruleRefs.current[scrollTargetId];
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollTargetId(null);
  }, [scrollTargetId, draft, openRules]);

  const resetKey = `${open}-${JSON.stringify(consistencyRules)}-${shiftIds.join(",")}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setDraft(normalizeConsistencyRules(consistencyRules, shiftIds));
    setOpenRules(new Set());
    setScrollTargetId(null);
  }

  const sortedPeople = sortPeopleByName(people);

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

  function addRule(templateKey) {
    const template = CONSISTENCY_RULE_TEMPLATES[Number(templateKey)];
    if (!template) return;

    const rule = createConsistencyRule(template, shiftIds, uid("cr"));
    setDraft((current) => [...current, rule]);
    setOpenRules((current) => new Set([...current, rule.id]));
    setScrollTargetId(rule.id);
  }

  function handleSave() {
    onSaveRules(draft);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Regras de consistência"
      width="max-w-xl"
      contentClassName="py-2 pr-3"
      footerClassName="mt-5 pt-5"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar regras
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-6">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Adicione regras, escolha o turno quando necessário e vincule pessoas. Use as setas para
          reordenar. Inconsistências aparecem quando a escala não cumpre o padrão definido.
        </p>

        <label className="block">
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Nova regra
          </span>
          <select
            className={`${inputClass} w-full`}
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;
              addRule(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Selecione um tipo de regra...</option>
            {CONSISTENCY_RULE_TEMPLATES.map((template, index) => (
              <option key={`${template.type}-${template.expectedCount}`} value={index}>
                {template.label}
              </option>
            ))}
          </select>
        </label>

        {draft.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-soft px-5 py-10 text-center text-[13px] leading-relaxed text-ink-soft">
            Nenhuma regra cadastrada. Use o seletor acima para adicionar a primeira.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.map((rule, index) => (
              <RuleAccordionItem
                key={rule.id}
                rule={rule}
                itemRef={(node) => {
                  if (node) ruleRefs.current[rule.id] = node;
                  else delete ruleRefs.current[rule.id];
                }}
                people={people}
                sortedPeople={sortedPeople}
                shifts={shifts}
                shiftsById={shiftsById}
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
