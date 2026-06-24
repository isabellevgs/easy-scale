import { useMemo, useState } from "react";
import { CalendarPlus, Trash2, Pencil, Users as UsersIcon, History, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import {
  Button,
  Card,
  Modal,
  Field,
  inputClass,
  IconButton,
  PersonAvatar,
} from "../components/ui";
import { ShiftBadge } from "../components/ui";
import RuleModal from "../components/RuleModal";
import { WEEKDAY_LABELS_FULL, MONTH_LABELS } from "../lib/constants";
import { useShifts } from "../hooks/useShifts";
import { describeRecurrence, partitionRulesByStatus } from "../lib/schedule";
import { colorForPerson } from "../lib/constants";
import { sortShiftIds } from "../lib/shifts";
import { validateRuleSingleShiftPerDay } from "../lib/scheduleValidation";
import { usePersist } from "../hooks/usePersist";
import PageContainer from "../components/PageContainer";

const RECURRENCE_TYPES = [
  { id: "specific_date", label: "Dia específico" },
  { id: "weekly", label: "Semanal" },
];

const DEFAULT_FILTERS = {
  status: "all",
  personId: "",
  recurrenceType: "",
  shiftIds: [],
};

function matchesFilters(rule, filters) {
  if (filters.personId && rule.personId !== filters.personId) return false;
  if (filters.recurrenceType && rule.recurrence.type !== filters.recurrenceType) return false;
  if (
    filters.shiftIds.length > 0 &&
    !filters.shiftIds.some((shiftId) => rule.shifts.includes(shiftId))
  ) {
    return false;
  }
  return true;
}

function countActiveFilters(filters) {
  let count = 0;
  if (filters.status !== "all") count++;
  if (filters.personId) count++;
  if (filters.recurrenceType) count++;
  if (filters.shiftIds.length > 0) count++;
  return count;
}

export default function SchedulesPage({ people, rules, addRule, updateRule, removeRule, holidays = [] }) {
  const { shifts, shiftsById } = useShifts();
  const { persist } = usePersist();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people]
  );

  const { active: activeRules, expired: expiredRules } = useMemo(
    () => partitionRulesByStatus(rules),
    [rules]
  );

  const filteredActiveRules = useMemo(
    () => activeRules.filter((rule) => matchesFilters(rule, filters)),
    [activeRules, filters]
  );

  const filteredExpiredRules = useMemo(
    () => expiredRules.filter((rule) => matchesFilters(rule, filters)),
    [expiredRules, filters]
  );

  const showActiveSection = filters.status !== "expired";
  const showExpiredSection = filters.status !== "active";
  const hasActiveFilters = countActiveFilters(filters) > 0;
  const activeFilterCount = countActiveFilters(filters);

  const visibleCount =
    (showActiveSection ? filteredActiveRules.length : 0) +
    (showExpiredSection ? filteredExpiredRules.length : 0);

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(rule) {
    setEditing(rule);
    setModalOpen(true);
  }

  function handleSave(ruleData) {
    const payload =
      ruleData.recurrence?.type === "specific_date"
        ? { ...ruleData, startDate: "", endDate: "" }
        : ruleData;

    const validation = validateRuleSingleShiftPerDay(rules, payload, holidays, {
      excludeRuleId: editing?.id,
      shiftsById,
    });
    if (!validation.ok) {
      persist(() => Promise.resolve(validation), "", "");
      return;
    }

    const action = editing
      ? () => updateRule(editing.id, payload)
      : () => addRule(payload);
    const successMessage = editing ? "Escala atualizada." : "Escala criada.";

    persist(action, successMessage, "Não foi possível salvar a escala.").then((result) => {
      if (result?.ok) setModalOpen(false);
    });
  }

  const noPeople = people.length === 0;

  return (
    <PageContainer size="narrow">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Escalas</h1>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            Crie regras de recorrência para cada pessoa da equipe.
          </p>
        </div>
        <Button onClick={openNew} disabled={noPeople}>
          <CalendarPlus className="h-4 w-4" />
          Nova escala
        </Button>
      </div>

      {noPeople ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3">
            <UsersIcon className="h-5 w-5 text-ink-faint" />
          </div>
          <h2 className="text-[15px] font-medium text-ink">Cadastre a equipe primeiro</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Você precisa ter pelo menos uma pessoa cadastrada para montar uma escala.
          </p>
        </Card>
      ) : rules.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3">
            <CalendarPlus className="h-5 w-5 text-ink-faint" />
          </div>
          <h2 className="text-[15px] font-medium text-ink">Nenhuma escala criada</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Crie a primeira regra de escala para ver os turnos no calendário.
          </p>
          <Button className="mt-5" onClick={openNew}>
            Nova escala
          </Button>
        </Card>
      ) : (
        <div className="space-y-5">
          <ScheduleFilters
            people={people}
            shifts={shifts}
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            resultCount={visibleCount}
          />

          {visibleCount === 0 ? (
            <Card className="px-5 py-10 text-center">
              <p className="text-[14px] font-medium text-ink">Nenhuma escala encontrada</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                Ajuste os filtros ou limpe a seleção para ver todas as escalas.
              </p>
              {hasActiveFilters && (
                <Button className="mt-4" variant="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </Card>
          ) : (
            <>
              {showActiveSection && filteredActiveRules.length === 0 && activeRules.length > 0 && (
                <Card className="px-5 py-6 text-center">
                  <p className="text-[13px] text-ink-soft">
                    Nenhuma escala ativa corresponde aos filtros selecionados.
                  </p>
                </Card>
              )}

              {showActiveSection && activeRules.length === 0 && (
                <Card className="px-5 py-8 text-center">
                  <p className="text-[14px] font-medium text-ink">Nenhuma escala ativa</p>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    Todas as regras cadastradas já passaram. Crie uma nova escala ou consulte o histórico
                    abaixo.
                  </p>
                  <Button className="mt-4" onClick={openNew}>
                    Nova escala
                  </Button>
                </Card>
              )}

              {showActiveSection && filteredActiveRules.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                    Escalas ativas
                  </h2>
                  <Card className="divide-y divide-border-soft">
                    {filteredActiveRules.map((rule) => (
                      <RuleListItem
                        key={rule.id}
                        rule={rule}
                        person={peopleById[rule.personId]}
                        people={people}
                        onEdit={() => openEdit(rule)}
                        onDelete={() => setConfirmDelete(rule)}
                      />
                    ))}
                  </Card>
                </section>
              )}

              {showExpiredSection && filteredExpiredRules.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <History className="h-4 w-4 text-ink-faint" />
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                      Escalas passadas
                    </h2>
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                      {filteredExpiredRules.length}
                    </span>
                  </div>
                  <Card className="divide-y divide-border-soft border-dashed">
                    {filteredExpiredRules.map((rule) => (
                      <RuleListItem
                        key={rule.id}
                        rule={rule}
                        person={peopleById[rule.personId]}
                        people={people}
                        expired
                        onEdit={() => openEdit(rule)}
                        onDelete={() => setConfirmDelete(rule)}
                      />
                    ))}
                  </Card>
                </section>
              )}
            </>
          )}
        </div>
      )}

      <RuleModal
        open={modalOpen}
        people={people}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover escala">
        <p className="text-[14px] text-ink-soft">Tem certeza que deseja remover esta regra de escala?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              persist(
                () => removeRule(confirmDelete.id),
                "Escala removida.",
                "Não foi possível remover a escala."
              ).then((result) => {
                if (result?.ok) setConfirmDelete(null);
              });
            }}
          >
            Remover
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}

const STATUS_OPTIONS = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Ativas" },
  { id: "expired", label: "Passadas" },
];

function ScheduleFilters({
  people,
  shifts,
  filters,
  onChange,
  onClear,
  hasActiveFilters,
  activeFilterCount,
  resultCount,
}) {
  const [open, setOpen] = useState(false);

  function setFilter(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function toggleShift(shiftId) {
    const current = filters.shiftIds;
    const next = current.includes(shiftId)
      ? current.filter((id) => id !== shiftId)
      : [...current, shiftId];
    setFilter("shiftIds", next);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left transition-colors hover:opacity-90"
          aria-expanded={open}
        >
          <div className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-soft" />
            <span className="text-[13px] font-medium text-ink-soft">Filtros</span>
            {hasActiveFilters && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                {activeFilterCount} ativo{activeFilterCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[12px] text-ink-faint">
              {resultCount} resultado{resultCount !== 1 ? "s" : ""}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-ink-faint transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-border-soft px-4 py-4">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-faint">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter("status", option.id)}
                  className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    filters.status === option.id
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border text-ink-soft hover:bg-surface-2"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pessoa">
              <select
                className={inputClass}
                value={filters.personId}
                onChange={(e) => setFilter("personId", e.target.value)}
              >
                <option value="">Todas as pessoas</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo">
              <select
                className={inputClass}
                value={filters.recurrenceType}
                onChange={(e) => setFilter("recurrenceType", e.target.value)}
              >
                <option value="">Todos os tipos</option>
                {RECURRENCE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-faint">
              Turno <span className="font-normal text-ink-faint/80"></span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {shifts.map((shift) => {
                const active = filters.shiftIds.includes(shift.id);
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => toggleShift(shift.id)}
                    className="rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors"
                    style={
                      active
                        ? { borderColor: shift.color, background: shift.soft, color: shift.color }
                        : { borderColor: "var(--color-border)", color: "var(--color-ink-soft)" }
                    }
                  >
                    {shift.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function RuleListItem({ rule, person, people, expired = false, onEdit, onDelete }) {
  const { shiftsConfig } = useShifts();
  if (!person) return null;

  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 ${expired ? "bg-surface/40 opacity-90" : ""}`}
    >
      <PersonAvatar nome={person.nome} color={colorForPerson(person.id, people)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[14px] font-medium ${expired ? "text-ink-soft" : "text-ink"}`}>
            {person.nome}
          </p>
          {expired && (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              Passada
            </span>
          )}
        </div>
        <p className="text-[12px] text-ink-faint">
          {describeRecurrence(rule, WEEKDAY_LABELS_FULL, MONTH_LABELS)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sortShiftIds(rule.shifts, shiftsConfig).map((s) => (
            <ShiftBadge key={s} shiftId={s} size="sm" />
          ))}
        </div>
      </div>
      <IconButton onClick={onEdit} aria-label="Editar">
        <Pencil className="h-4 w-4" />
      </IconButton>
      <IconButton variant="danger" onClick={onDelete} aria-label="Remover">
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
