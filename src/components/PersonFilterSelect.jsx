import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Users, X } from "lucide-react";
import { PersonAvatar } from "./ui";
import { colorForPerson, sortPeopleByName } from "../lib/constants";

function SelectAllCheckbox({ checked, indeterminate }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
        checked || indeterminate
          ? "border-brand bg-brand text-base"
          : "border-border bg-surface-3"
      }`}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      {!checked && indeterminate && (
        <span className="h-0.5 w-2.5 rounded-full bg-base" />
      )}
    </span>
  );
}

function TriggerContent({ people, value }) {
  const selected = people.filter((p) => value.includes(p.id));

  if (selected.length === 0 || selected.length === people.length) {
    return (
      <>
        <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
        <span className="whitespace-nowrap">Todas as pessoas</span>
      </>
    );
  }

  if (selected.length === 1) {
    const person = selected[0];
    return (
      <>
        <PersonAvatar
          nome={person.nome}
          color={colorForPerson(person.id, people)}
          size={20}
        />
        <span className="truncate">{person.nome}</span>
      </>
    );
  }

  return (
    <>
      <span className="flex -space-x-1.5">
        {selected.slice(0, 3).map((person) => (
          <PersonAvatar
            key={person.id}
            nome={person.nome}
            color={colorForPerson(person.id, people)}
            size={20}
          />
        ))}
      </span>
      <span className="whitespace-nowrap">
        {selected.length} pessoa{selected.length !== 1 ? "s" : ""}
      </span>
    </>
  );
}

export default function PersonFilterSelect({ people, value = [], onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const sortedPeople = sortPeopleByName(people);
  const hasSelection = value.length > 0;
  const allSelected = people.length > 0 && value.length === people.length;
  const someSelected = hasSelection && !allSelected;

  useEffect(() => {
    if (!open) return;
    function handleClick(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (people.length === 0) return null;

  function togglePerson(id) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(people.map((person) => person.id));
    }
  }

  function clearFilter(event) {
    event.stopPropagation();
    onChange([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex max-w-[240px] items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
          hasSelection
            ? "border-brand/50 bg-brand-soft text-ink"
            : "border-border-soft bg-surface-2 text-ink-soft hover:border-border hover:bg-surface-3 hover:text-ink"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Filtrar por pessoa"
      >
        <TriggerContent people={people} value={value} />
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-ink-faint transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
        {hasSelection && (
          <span
            role="button"
            tabIndex={0}
            onClick={clearFilter}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                clearFilter(event);
              }
            }}
            className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface/80 hover:text-ink"
            aria-label="Limpar filtro"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute right-0 z-50 mt-2 max-h-[min(320px,50vh)] min-w-[240px] overflow-y-auto rounded-xl border border-border-soft bg-surface-2 py-1 shadow-2xl"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Filtrar pessoas
            </p>
            {hasSelection && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-ink-soft hover:text-ink hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="mx-3 border-t border-border-soft" />

          <button
            type="button"
            role="option"
            aria-selected={allSelected}
            onClick={toggleAll}
            className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-surface-3 ${
              allSelected || someSelected ? "bg-brand-soft/40 font-medium text-ink" : "text-ink-soft"
            }`}
          >
            <SelectAllCheckbox checked={allSelected} indeterminate={someSelected} />
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-surface-3">
              <Users className="h-3.5 w-3.5 text-ink-faint" strokeWidth={2.25} />
            </span>
            <span>Selecionar todos</span>
          </button>

          <div className="mx-3 my-1 border-t border-border-soft" />

          {sortedPeople.map((person) => {
            const active = value.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => togglePerson(person.id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-surface-3 ${
                  active ? "bg-brand-soft/40 text-ink" : "text-ink-soft"
                }`}
              >
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
                    active
                      ? "border-brand bg-brand text-base"
                      : "border-border bg-surface-3"
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
          })}
        </div>
      )}
    </div>
  );
}
