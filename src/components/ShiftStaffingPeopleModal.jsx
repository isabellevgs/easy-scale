import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { Modal, PersonAvatar, Button, Field, inputClass } from "./ui";
import { colorForPerson, peopleScheduledIn, WEEKDAY_LABELS } from "../lib/constants";
import {
  getStaffingStatus,
  staffingStatusLabel,
  staffingStatusStyles,
} from "../lib/shiftNeeds";
import { getOccurrences } from "../lib/schedule";

const RECURRENCE_TYPES = [
  { id: "specific_date", label: "Dia específico" },
  { id: "weekly", label: "Semanal" },
];

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
}) {
  const [personId, setPersonId] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("specific_date");
  const [weekdays, setWeekdays] = useState([]);
  const [endDate, setEndDate] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const contextDayOfWeek = useMemo(() => {
    if (!dateISO) return 0;
    return new Date(`${dateISO}T00:00:00`).getDay();
  }, [dateISO]);

  const shiftOccs = useMemo(() => {
    if (!open || !dateISO || !shift) return [];
    const dayOccurrences = getOccurrences(rules, dateISO, dateISO, holidays);
    return dayOccurrences.filter((occ) => occ.shift === shift.id);
  }, [open, dateISO, shift, rules, holidays]);

  const scheduledPeople = useMemo(
    () => peopleScheduledIn(shiftOccs, allPeople),
    [shiftOccs, allPeople]
  );

  const availablePeople = useMemo(
    () => allPeople.filter((person) => !scheduledPeople.some((item) => item.id === person.id)),
    [allPeople, scheduledPeople]
  );

  useEffect(() => {
    if (!open) return;
    setAddOpen(false);
    setRecurrenceType("specific_date");
    setWeekdays([contextDayOfWeek]);
    setEndDate("");
    setPersonId(availablePeople[0]?.id ?? "");
  }, [open, dateISO, shift?.id, contextDayOfWeek, availablePeople]);

  if (!shift) return null;

  const scheduled = shiftOccs.length;
  const status = getStaffingStatus(required, scheduled);
  const styles = staffingStatusStyles(status);
  const detail = staffingStatusLabel(status, required, scheduled);
  const Icon = shift.icon;

  const isValid =
    personId &&
    (recurrenceType === "specific_date" || weekdays.length > 0);

  function toggleWeekday(day) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
    );
  }

  function handleAdd(event) {
    event.preventDefault();
    if (!isValid || !dateISO) return;

    if (recurrenceType === "specific_date") {
      addRule({
        personId,
        shifts: [shift.id],
        recurrence: { type: "specific_date", date: dateISO },
        startDate: "",
        endDate: "",
      });
      return;
    }

    addRule({
      personId,
      shifts: [shift.id],
      recurrence: { type: "weekly", weekdays },
      startDate: dateISO,
      endDate,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`${shift.label} · ${dateLabel}`} width="max-w-lg">
      <div
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
        style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} style={{ color: shift.color }} />
        {detail}
      </div>

      <div className="mt-4">
        {scheduledPeople.length === 0 ? (
          <p className="text-[14px] text-ink-faint">Ninguém escalado</p>
        ) : (
          <div className="space-y-2">
            {scheduledPeople.map((person) => (
              <div key={person.id} className="flex items-center gap-2.5">
                <PersonAvatar
                  nome={person.nome}
                  color={colorForPerson(person.id, allPeople)}
                  size={26}
                />
                <span className="text-[14px] text-ink">{person.nome}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-border-soft pt-4">
        <button
          type="button"
          onClick={() => setAddOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left transition-opacity hover:opacity-90"
          aria-expanded={addOpen}
        >
          <span className="text-[13px] font-medium text-ink">Adicionar na escala</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${
              addOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {addOpen && (
          <div className="mt-3">
            {allPeople.length === 0 ? (
              <p className="text-[13px] text-ink-soft">
                Cadastre pessoas na{" "}
                <Link to="/equipe" className="text-brand hover:underline" onClick={onClose}>
                  equipe
                </Link>{" "}
                antes de montar a escala.
              </p>
            ) : availablePeople.length === 0 ? (
              <p className="text-[13px] text-ink-soft">Toda a equipe já está escalada neste turno.</p>
            ) : (
              <form onSubmit={handleAdd} className="space-y-3">
                <Field label="Pessoa">
                  <select
                    className={inputClass}
                    value={personId}
                    onChange={(event) => setPersonId(event.target.value)}
                  >
                    {availablePeople.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.nome}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Tipo de recorrência">
                  <div className="grid grid-cols-2 gap-2">
                    {RECURRENCE_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setRecurrenceType(type.id)}
                        className={`rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                          recurrenceType === type.id
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-border text-ink-soft hover:bg-surface-2"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {recurrenceType === "specific_date" ? (
                  <Field label="Data">
                    <input type="date" className={inputClass} value={dateISO} readOnly />
                  </Field>
                ) : (
                  <>
                    <Field label="Dias da semana">
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_LABELS.map((label, index) => {
                          const active = weekdays.includes(index);
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
                      <Field label="Início">
                        <input type="date" className={inputClass} value={dateISO} readOnly />
                      </Field>
                      <Field label="Fim (opcional)" hint="Vazio = sem data de término">
                        <input
                          type="date"
                          className={inputClass}
                          value={endDate}
                          onChange={(event) => setEndDate(event.target.value)}
                        />
                      </Field>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={!isValid}>
                    <CalendarPlus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </form>
            )}

            <p className="mt-3 text-[12px] text-ink-faint">
              {recurrenceType === "specific_date"
                ? `Cria uma escala só para ${dateLabel}.`
                : "Cria uma escala semanal recorrente a partir desta data."}{" "}
              <Link
                to="/escalas"
                className="text-ink-soft hover:text-ink hover:underline"
                onClick={onClose}
              >
                Ver todas as escalas
              </Link>
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
