import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeftRight } from "lucide-react";
import { Card } from "./ui";
import { describeScaleType } from "../lib/rules";
import { buildSubstitutionLookup, describeSubstitution } from "../lib/substitutions";

function formatSubstitutionDate(dateISO) {
  return format(parseISO(dateISO), "dd/MM/yyyy · EEE", { locale: ptBR });
}

export default function SubstitutionsHistoryCard({ substitutions, people, shiftsById }) {
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));
  const items = substitutions.slice(0, 50);

  if (items.length === 0) {
    return (
      <Card className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3">
            <ArrowLeftRight className="h-4 w-4 text-ink-faint" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Histórico de substituições</h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              Nenhuma substituição registrada ainda. Use o botão de substituir na escala semanal ou
              mensal quando houver um imprevisto.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border-soft px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Histórico de substituições</h2>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Registro das trocas pontuais feitas na escala ({items.length}
          {substitutions.length > items.length ? ` de ${substitutions.length}` : ""}).
        </p>
      </div>

      <div className="max-h-[min(420px,50vh)] overflow-y-auto">
        <ul className="divide-y divide-border-soft">
          {items.map((item) => {
            const fromName = peopleById[item.fromPersonId]?.nome ?? "—";
            const toName = peopleById[item.toPersonId]?.nome ?? "—";
            const shiftLabel = shiftsById[item.shiftId]?.label ?? "Turno";
            const lookup = describeSubstitution(item, peopleById);

            return (
              <li key={item.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14px] font-medium text-ink">
                    {fromName} → {toName}
                  </p>
                  <span className="text-[12px] text-ink-faint">
                    {formatSubstitutionDate(item.dateISO)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {shiftLabel} · {describeScaleType(item.scaleType)}
                </p>
                {item.note ? (
                  <p className="mt-1 text-[12px] text-ink-faint">{item.note}</p>
                ) : (
                  <p className="mt-1 text-[12px] text-ink-faint">{lookup}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

export function SubstitutionBadge({ substitution, peopleById }) {
  if (!substitution) return null;

  const title = describeSubstitution(substitution, peopleById);

  return (
    <span
      className="ml-1 inline-flex shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-100 ring-1 ring-sky-200/40"
      style={{ background: "rgba(14, 116, 144, 0.55)" }}
      title={title}
    >
      Subst.
    </span>
  );
}

export function buildSubstitutionsByCell(substitutions) {
  return buildSubstitutionLookup(substitutions);
}
