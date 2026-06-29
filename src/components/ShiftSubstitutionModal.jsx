import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Modal, PersonAvatar, Field, inputClass } from "./ui";
import { colorForPerson, sortPeopleByName } from "../lib/constants";
import { getOccurrences } from "../lib/schedule";
import { findConflictingShiftForPerson } from "../lib/scheduleValidation";
import { SCALE_TYPES } from "../lib/rules";
import {
  getOutgoingRuleContext,
  formatSubstitutionWorkloadPreview,
} from "../lib/substitutions";
import { useShifts } from "../hooks/useShifts";

export default function ShiftSubstitutionModal({
  open,
  onClose,
  fromPerson,
  shift,
  dateLabel,
  dateISO,
  rules,
  allPeople,
  holidays = [],
  onConfirm,
  zIndex = 60,
}) {
  const { shiftsById } = useShifts();
  const [note, setNote] = useState("");
  const [pendingPersonId, setPendingPersonId] = useState(null);

  const dayOccurrences = useMemo(() => {
    if (!open || !dateISO) return [];
    return getOccurrences(rules, dateISO, dateISO, holidays);
  }, [open, dateISO, rules, holidays]);

  const scaleType = useMemo(() => {
    if (!fromPerson || !shift || !dateISO) return SCALE_TYPES.REGULAR;
    return (
      getOutgoingRuleContext(
        rules,
        { fromPersonId: fromPerson.id, shiftId: shift.id, dateISO },
        holidays
      )?.scaleType ?? SCALE_TYPES.REGULAR
    );
  }, [fromPerson, shift, dateISO, rules, holidays]);

  const candidates = useMemo(() => {
    if (!fromPerson || !shift) return [];
    const scheduledOnShift = new Set(
      dayOccurrences.filter((occ) => occ.shift === shift.id).map((occ) => occ.personId)
    );

    return sortPeopleByName(allPeople).filter((person) => {
      if (person.id === fromPerson.id) return false;
      if (scheduledOnShift.has(person.id)) return false;
      return true;
    });
  }, [allPeople, dayOccurrences, fromPerson, shift]);

  const conflictingShiftByPerson = useMemo(() => {
    if (!shift) return new Map();
    const map = new Map();
    for (const person of candidates) {
      const conflictShiftId = findConflictingShiftForPerson(dayOccurrences, {
        personId: person.id,
        shiftId: shift.id,
        scaleType,
      });
      if (conflictShiftId) map.set(person.id, conflictShiftId);
    }
    return map;
  }, [candidates, dayOccurrences, shift, scaleType]);

  if (!fromPerson || !shift) return null;

  function handleClose() {
    setNote("");
    setPendingPersonId(null);
    onClose();
  }

  function handleSelectPerson(person) {
    const conflictShiftId = conflictingShiftByPerson.get(person.id);
    if (conflictShiftId) return;
    setPendingPersonId(person.id);
  }

  function handleConfirm() {
    const toPerson = allPeople.find((person) => person.id === pendingPersonId);
    if (!toPerson) return;

    const outgoingContext = getOutgoingRuleContext(
      rules,
      { fromPersonId: fromPerson.id, shiftId: shift.id, dateISO },
      holidays
    );

    onConfirm({
      fromPersonId: fromPerson.id,
      toPersonId: toPerson.id,
      shiftId: shift.id,
      dateISO,
      note: note.trim(),
      toPersonName: toPerson.nome,
      rules,
      outgoingContext,
    });
  }

  const pendingPerson = allPeople.find((person) => person.id === pendingPersonId);
  const workloadPreview =
    pendingPerson &&
    formatSubstitutionWorkloadPreview({
      fromPerson,
      toPerson: pendingPerson,
      shift,
      scaleType,
    });

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Substituir · ${fromPerson.nome}`}
      width="max-w-md"
      zIndex={zIndex}
    >
      <p className="text-[13px] text-ink-soft">
        {shift.label} · {dateLabel}. A pessoa original sai <strong>só deste dia</strong>; a escala
        recorrente dela permanece nos demais dias.
      </p>

      <div className="mt-4">
        <Field label="Motivo (opcional)">
        <input
          type="text"
          className={inputClass}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ex.: atestado médico, imprevisto familiar..."
          maxLength={200}
        />
      </Field>
      </div>

      {allPeople.length <= 1 ? (
        <p className="mt-4 text-[13px] text-ink-soft">
          Cadastre mais pessoas na{" "}
          <Link to="/equipe" className="text-brand hover:underline" onClick={handleClose}>
            equipe
          </Link>{" "}
          para fazer substituições.
        </p>
      ) : candidates.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-soft">
          Não há ninguém disponível para substituir neste turno.
        </p>
      ) : (
        <div className="mt-3 max-h-[min(320px,45vh)] space-y-1.5 overflow-y-auto pr-0.5">
          {candidates.map((person) => {
            const selected = pendingPersonId === person.id;
            const otherShiftId = conflictingShiftByPerson.get(person.id);
            const otherShiftLabel = otherShiftId ? shiftsById[otherShiftId]?.label : null;
            const personColor = colorForPerson(person.id, allPeople);
            const disabled = Boolean(otherShiftLabel);

            return (
              <button
                key={person.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectPerson(person)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-brand/40 bg-brand-soft/25"
                    : disabled
                      ? "cursor-not-allowed border-border-soft opacity-60"
                      : "border-border-soft hover:bg-surface-2"
                }`}
                aria-pressed={selected}
              >
                <PersonAvatar nome={person.nome} color={personColor} size={28} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{person.nome}</span>
                {otherShiftLabel && (
                  <span className="shrink-0 text-[11px] font-medium text-amber-500">
                    Em {otherShiftLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {workloadPreview && (
        <p className="mt-3 text-[12px] text-ink-faint">
          Carga horária neste dia: {workloadPreview}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 rounded-lg border border-border-soft px-4 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:bg-surface-2"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!pendingPersonId}
          onClick={handleConfirm}
          className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-medium text-base transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}
