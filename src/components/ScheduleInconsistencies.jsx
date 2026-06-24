import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, Button, PersonAvatar } from "./ui";
import ConsistencyRulesModal from "./ConsistencyRulesModal";
import { detectInconsistencies } from "../lib/consistencyRules";
import { colorForPerson } from "../lib/constants";

export default function ScheduleInconsistencies({
  people,
  rules,
  holidays,
  shiftsById,
  consistencyRules,
  onSaveRules,
  monthKeys,
  periodLabel,
}) {
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  const inconsistencies = useMemo(
    () =>
      detectInconsistencies({
        rules,
        holidays,
        people,
        consistencyRules,
        shiftsById,
        monthKeys,
      }),
    [rules, holidays, people, consistencyRules, shiftsById, monthKeys]
  );

  const hasRules = useMemo(
    () => Array.isArray(consistencyRules) && consistencyRules.length > 0,
    [consistencyRules]
  );

  const hasAssignments = useMemo(
    () => consistencyRules?.some((rule) => rule.personIds?.length > 0),
    [consistencyRules]
  );

  return (
    <>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-soft px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Inconsistências</h2>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {periodLabel
                ? `Verificação para ${periodLabel}`
                : "Verificação das regras de consistência na escala"}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setRulesModalOpen(true)}>
            Ver regras
          </Button>
        </div>

        <div className="px-6 py-5">
          {!hasRules ? (
            <div className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface-2 px-4 py-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
              <div>
                <p className="text-[13px] text-ink-soft">Nenhuma regra cadastrada ainda.</p>
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(true)}
                  className="mt-1 text-[13px] font-medium text-brand hover:underline"
                >
                  Criar regras e vincular pessoas
                </button>
              </div>
            </div>
          ) : !hasAssignments ? (
            <div className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface-2 px-4 py-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
              <div>
                <p className="text-[13px] text-ink-soft">
                  Nenhuma pessoa vinculada às regras ainda.
                </p>
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(true)}
                  className="mt-1 text-[13px] font-medium text-brand hover:underline"
                >
                  Configurar regras e pessoas
                </button>
              </div>
            </div>
          ) : inconsistencies.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-good/20 bg-good/10 px-4 py-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
              <p className="text-[13px] text-ink-soft">
                Nenhuma inconsistência encontrada para o período analisado.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {inconsistencies.map((item) => {
                const person = people.find((p) => p.id === item.personId);
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-bad/20 bg-bad/5 px-4 py-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {person && (
                            <PersonAvatar
                              nome={person.nome}
                              color={colorForPerson(person.id, people)}
                              size={22}
                            />
                          )}
                          <p className="text-[13px] font-medium text-ink">{item.message}</p>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {item.details.map((detail) => (
                            <li key={detail} className="text-[12px] text-ink-soft">
                              · {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <ConsistencyRulesModal
        open={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        people={people}
        consistencyRules={consistencyRules}
        onSaveRules={onSaveRules}
      />
    </>
  );
}
