import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Repeat } from "lucide-react";
import { Modal, PersonAvatar, IconButton } from "./ui";
import ShiftRecurrenceModal from "./ShiftRecurrenceModal";
import { colorForPerson, peopleScheduledIn, sortPeopleByName } from "../lib/constants";
import {
  getStaffingStatus,
  staffingStatusLabel,
  staffingStatusStyles,
} from "../lib/shiftNeeds";
import { getOccurrences } from "../lib/schedule";
import { isPersonShiftRecurring, togglePersonShiftOnDate } from "../lib/scheduleToggle";
import { requiresSingleShiftPerPerson } from "../lib/scheduleValidation";
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

  const otherShiftByPerson = useMemo(() => {
    if (!shift) return new Map();
    const map = new Map();
    for (const occ of dayOccurrences) {
      if (occ.shift === shift.id) continue;
      map.set(occ.personId, occ.shift);
    }
    return map;
  }, [dayOccurrences, shift]);

  if (!shift) return null;

  const enforceSingleShift = requiresSingleShiftPerPerson(dateISO, holidays);
  const scheduled = shiftOccs.length;
  const status = getStaffingStatus(required, scheduled);
  const styles = staffingStatusStyles(status);
  const detail = staffingStatusLabel(status, required, scheduled);

  function handleToggle(personId) {
    if (!dateISO || !shift) return;

    persist(
      () =>
        togglePersonShiftOnDate(
          { rules, addRule, updateRule, removeRule, holidays, shiftsById },
          { personId, shiftId: shift.id, dateISO }
        ),
      scheduledIds.has(personId) ? "Removido do turno." : "Adicionado ao turno.",
      "Não foi possível atualizar a escala."
    );
  }

  function handleClose() {
    setRecurrencePerson(null);
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
          {enforceSingleShift
            ? "Selecione quem trabalha neste turno. Em dias úteis (seg–sex), o aviso amarelo indica quem já está em outro turno."
            : "Selecione quem trabalha neste turno. Fins de semana e feriados permitem mais de um turno por pessoa."}
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
              const otherShiftId = otherShiftByPerson.get(person.id);
              const otherShiftLabel = otherShiftId ? shiftsById[otherShiftId]?.label : null;
              const showOtherShiftWarning =
                enforceSingleShift && !selected && Boolean(otherShiftLabel);
              const personColor = colorForPerson(person.id, allPeople);
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
                  className={`relative rounded-xl border transition-colors ${
                    selected
                      ? "border-brand/40 bg-brand-soft/25"
                      : "border-border-soft"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(person.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected ? "pr-11 hover:bg-brand-soft/35" : "hover:bg-surface-2"
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

                  {selected && (
                    <IconButton
                      className={`absolute right-1 top-1/2 z-10 -translate-y-1/2 ${
                        recurring ? "text-brand hover:text-brand" : ""
                      }`}
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

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
