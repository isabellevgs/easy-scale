import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Repeat, Pencil } from "lucide-react";
import { Modal, PersonAvatar, IconButton, Button } from "./ui";
import ShiftRecurrenceModal from "./ShiftRecurrenceModal";
import RuleModal from "./RuleModal";
import { colorForPerson, peopleScheduledIn, sortPeopleByName } from "../lib/constants";
import {
  getStaffingStatus,
  staffingStatusLabel,
  staffingStatusStyles,
  countScheduledPeopleForShift,
} from "../lib/shiftNeeds";
import { getOccurrences, describePersonScaleOverlap } from "../lib/schedule";
import PersonScaleOverlapIcon from "./PersonScaleOverlapIcon";
import {
  isPersonShiftRecurring,
  getPersonShiftRuleOnDate,
  removePersonShiftOnDate,
  schedulePersonOnShiftDate,
  UNSCHEDULE_SCOPE,
} from "../lib/scheduleToggle";
import { findConflictingShiftForPerson, validateRuleSingleShiftPerDay } from "../lib/scheduleValidation";
import { SCALE_TYPES } from "../lib/rules";
import { usePersist } from "../hooks/usePersist";
import { useShifts } from "../hooks/useShifts";

export default function ShiftStaffingPeopleModal({
  open,
  onClose,
  shift,
  required = 0,
  dateLabel,
  dateISO,
  rules,
  allPeople,
  holidays = [],
  addRule,
  updateRule,
  removeRule,
}) {
  const { shiftsById } = useShifts();
  const { persist } = usePersist();
  const [recurrencePerson, setRecurrencePerson] = useState(null);
  const [adjustPerson, setAdjustPerson] = useState(null);
  const [removeConfirmPerson, setRemoveConfirmPerson] = useState(null);

  const dayOccurrences = useMemo(() => {
    if (!open || !dateISO) return [];
    return getOccurrences(rules, dateISO, dateISO, holidays);
  }, [open, dateISO, rules, holidays]);

  const shiftOccs = useMemo(() => {
    if (!shift) return [];
    return dayOccurrences.filter((occ) => occ.shift === shift.id);
  }, [dayOccurrences, shift]);

  const scheduledPeople = useMemo(
    () => peopleScheduledIn(shiftOccs, allPeople),
    [shiftOccs, allPeople]
  );

  const scheduledIds = useMemo(
    () => new Set(scheduledPeople.map((person) => person.id)),
    [scheduledPeople]
  );

  const conflictingShiftByPerson = useMemo(() => {
    if (!shift) return new Map();
    const map = new Map();
    for (const person of allPeople) {
      const conflictShiftId = findConflictingShiftForPerson(dayOccurrences, {
        personId: person.id,
        shiftId: shift.id,
        scaleType: SCALE_TYPES.REGULAR,
      });
      if (conflictShiftId) map.set(person.id, conflictShiftId);
    }
    return map;
  }, [dayOccurrences, shift, allPeople]);

  const adjustEditingRule = useMemo(() => {
    if (!adjustPerson || !shift || !dateISO) return null;
    return getPersonShiftRuleOnDate(
      rules,
      { personId: adjustPerson.id, shiftId: shift.id, dateISO },
      holidays
    );
  }, [adjustPerson, shift, dateISO, rules, holidays]);

  if (!shift) return null;

  const scheduled = countScheduledPeopleForShift(dayOccurrences, shift.id);
  const status = getStaffingStatus(required, scheduled);
  const styles = staffingStatusStyles(status);
  const detail = staffingStatusLabel(status, required, scheduled);

  function handlePersonClick(personId) {
    if (!dateISO || !shift) return;

    if (scheduledIds.has(personId)) {
      const person = allPeople.find((item) => item.id === personId);
      if (person) setRemoveConfirmPerson(person);
      return;
    }

    persist(
      () =>
        schedulePersonOnShiftDate({
          addRule,
          rules,
          personId,
          shiftId: shift.id,
          dateISO,
          holidays,
          shiftsById,
        }),
      "Adicionado ao turno.",
      "Não foi possível atualizar a escala."
    );
  }

  function handleRemove(scope) {
    if (!removeConfirmPerson || !dateISO || !shift) return;

    const messages = {
      [UNSCHEDULE_SCOPE.DAY]: "Removido deste dia.",
      [UNSCHEDULE_SCOPE.FUTURE]: "Removido deste dia em diante.",
      [UNSCHEDULE_SCOPE.ALL]: "Escala removida.",
    };

    persist(
      () =>
        removePersonShiftOnDate(
          { rules, addRule, updateRule, removeRule, holidays },
          { personId: removeConfirmPerson.id, shiftId: shift.id, dateISO },
          scope
        ),
      messages[scope],
      "Não foi possível atualizar a escala."
    ).then((result) => {
      if (result?.ok) setRemoveConfirmPerson(null);
    });
  }

  function handleAdjustSave(ruleData) {
    if (!adjustEditingRule) return;

    const payload =
      ruleData.recurrence?.type === "specific_date" ||
      ruleData.recurrence?.type === "specific_dates"
        ? { ...ruleData, startDate: "", endDate: "" }
        : ruleData.recurrence?.type === "custom"
          ? {
              ...ruleData,
              endDate:
                ruleData.recurrence.endType === "on_date" ? ruleData.recurrence.endDate : "",
            }
          : ruleData;

    const validation = validateRuleSingleShiftPerDay(rules, payload, holidays, {
      excludeRuleId: adjustEditingRule.id,
      shiftsById,
    });
    if (!validation.ok) {
      persist(() => Promise.resolve(validation), "", "");
      return;
    }

    persist(
      () => updateRule(adjustEditingRule.id, payload),
      "Escala atualizada.",
      "Não foi possível salvar a escala."
    ).then((result) => {
      if (result?.ok) setAdjustPerson(null);
    });
  }

  function handleClose() {
    setRecurrencePerson(null);
    setAdjustPerson(null);
    setRemoveConfirmPerson(null);
    onClose();
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title={`${shift.label} · ${dateLabel}`} width="max-w-md">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text }}
        >
          {detail}
        </div>

        <p className="mt-4 text-[13px] text-ink-soft">
          Selecione quem trabalha neste turno. No mesmo dia, é permitido combinar regular com hora
          extra, plantão com plantão, plantão com hora extra ou hora extra com hora extra. O aviso
          amarelo indica quem já está escalado(a) de forma incompatível neste dia.
        </p>

        {allPeople.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-soft">
            Cadastre pessoas na{" "}
            <Link to="/equipe" className="text-brand hover:underline" onClick={handleClose}>
              equipe
            </Link>{" "}
            antes de montar a escala.
          </p>
        ) : (
          <div className="mt-3 max-h-[min(420px,55vh)] space-y-1.5 overflow-y-auto pr-0.5">
            {sortPeopleByName(allPeople).map((person) => {
              const selected = scheduledIds.has(person.id);
              const otherShiftId = conflictingShiftByPerson.get(person.id);
              const otherShiftLabel = otherShiftId ? shiftsById[otherShiftId]?.label : null;
              const showOtherShiftWarning = !selected && Boolean(otherShiftLabel);
              const personColor = colorForPerson(person.id, allPeople);
              const overlapLabel = describePersonScaleOverlap(shiftOccs, person.id);
              const hasScaleOverlap = Boolean(overlapLabel);

              const recurring =
                selected &&
                isPersonShiftRecurring(
                  rules,
                  { personId: person.id, shiftId: shift.id, dateISO },
                  holidays
                );

              return (
                <div
                  key={person.id}
                  className={`relative flex items-stretch rounded-xl border transition-colors ${
                    selected
                      ? "border-brand/40 bg-brand-soft/25"
                      : "border-border-soft"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handlePersonClick(person.id)}
                    className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected ? "pr-2 hover:bg-brand-soft/35" : "hover:bg-surface-2"
                    }`}
                    aria-pressed={selected}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        selected ? "border-brand bg-brand text-base" : "border-border bg-surface"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <PersonAvatar nome={person.nome} color={personColor} size={28} />
                    <span
                      className="min-w-0 flex-1 truncate text-[14px] font-medium"
                      style={{ color: selected ? personColor : undefined }}
                    >
                      {person.nome}
                    </span>
                    {showOtherShiftWarning && (
                      <span className="shrink-0 text-[11px] font-medium text-amber-500">
                        Em {otherShiftLabel}
                      </span>
                    )}
                  </button>

                  {hasScaleOverlap && (
                    <div className="flex shrink-0 items-center pr-1">
                      <PersonScaleOverlapIcon title={overlapLabel} />
                    </div>
                  )}

                  {selected && (
                    <div className="my-auto flex shrink-0 items-center pr-1">
                      <IconButton
                        onClick={() => setAdjustPerson(person)}
                        aria-label="Ajustar escala atual"
                        title="Ajustar escala atual"
                      >
                        <Pencil className="h-4 w-4 text-ink-faint" />
                      </IconButton>
                      <IconButton
                        className={recurring ? "text-brand hover:text-brand" : ""}
                        onClick={() => setRecurrencePerson(person)}
                        aria-label="Configurar recorrência"
                        title={
                          recurring
                            ? "Escala semanal — toque para editar"
                            : "Só este dia — toque para tornar recorrente"
                        }
                      >
                        <Repeat className={`h-4 w-4 ${recurring ? "text-brand" : "text-ink-faint"}`} />
                      </IconButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        open={!!removeConfirmPerson}
        onClose={() => setRemoveConfirmPerson(null)}
        title="Remover da escala"
        width="max-w-sm"
        zIndex={60}
      >
        <p className="text-[14px] text-ink-soft">
          Remover <strong className="text-ink">{removeConfirmPerson?.nome}</strong> de{" "}
          {shift.label} · {dateLabel}?
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-start"
            onClick={() => handleRemove(UNSCHEDULE_SCOPE.DAY)}
          >
            Excluir apenas esse dia
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-start"
            onClick={() => handleRemove(UNSCHEDULE_SCOPE.FUTURE)}
          >
            Excluir todos os futuros
          </Button>
          <Button
            type="button"
            variant="danger"
            className="w-full justify-start"
            onClick={() => handleRemove(UNSCHEDULE_SCOPE.ALL)}
          >
            Excluir toda escala
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center"
            onClick={() => setRemoveConfirmPerson(null)}
          >
            Cancelar
          </Button>
        </div>
      </Modal>

      <RuleModal
        open={!!adjustPerson && !!adjustEditingRule}
        people={allPeople}
        initial={adjustEditingRule}
        title="Ajustar escala"
        zIndex={60}
        onClose={() => setAdjustPerson(null)}
        onSave={handleAdjustSave}
      />

      <ShiftRecurrenceModal
        open={!!recurrencePerson}
        onClose={() => setRecurrencePerson(null)}
        person={recurrencePerson}
        shift={shift}
        dateISO={dateISO}
        dateLabel={dateLabel}
        rules={rules}
        holidays={holidays}
        addRule={addRule}
        updateRule={updateRule}
        removeRule={removeRule}
      />
    </>
  );
}
