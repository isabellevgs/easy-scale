import { useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Card, IconButton } from "../components/ui";
import { MONTH_LABELS } from "../lib/constants";
import { getOccurrences, toISODate } from "../lib/schedule";
import { computeWorkloadGrid, formatWorkloadCell } from "../lib/workload";
import { useShifts } from "../hooks/useShifts";
import PageContainer from "../components/PageContainer";

export default function WorkloadSummaryPage({ people, rules, holidays = [] }) {
  const { shiftsById } = useShifts();
  const [monthOffset, setMonthOffset] = useState(0);

  const baseMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthStartISO = toISODate(startOfMonth(baseMonth));
  const monthEndISO = toISODate(endOfMonth(baseMonth));
  const monthLabel = `${MONTH_LABELS[baseMonth.getMonth()]} de ${baseMonth.getFullYear()}`;

  const occurrences = useMemo(
    () => getOccurrences(rules, monthStartISO, monthEndISO, holidays),
    [rules, monthStartISO, monthEndISO, holidays]
  );

  const grid = useMemo(
    () =>
      computeWorkloadGrid({
        people,
        occurrences,
        shiftsById,
        monthStartISO,
        monthEndISO,
      }),
    [people, occurrences, shiftsById, monthStartISO, monthEndISO]
  );

  return (
    <PageContainer size="wide">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Carga horária</h1>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            Horas líquidas por colaborador, semana a semana no mês selecionado.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border-soft bg-surface px-1 py-1">
          <IconButton onClick={() => setMonthOffset((value) => value - 1)} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="min-w-[180px] px-2 text-center text-[14px] font-medium text-ink">
            {monthLabel}
          </span>
          <IconButton onClick={() => setMonthOffset((value) => value + 1)} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {people.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3">
            <Clock className="h-5 w-5 text-ink-faint" />
          </div>
          <h2 className="text-[15px] font-medium text-ink">Nenhuma pessoa cadastrada</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Adicione a equipe para acompanhar a carga horária mensal.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border-soft bg-surface-2 text-[11px] uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium text-brand">Colaborador</th>
                  {grid.weekColumns.map((week) => (
                    <th
                      key={week.index}
                      className="px-3 py-3 text-center font-medium text-brand"
                      title={[week.title, week.hint].filter(Boolean).join(" · ")}
                    >
                      <span className="block">{week.label}</span>
                      <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-white">
                        {week.rangeLabel}
                      </span>
                    </th>
                  ))}
                  <th className="border-l border-border-soft px-5 py-3 text-center font-medium text-brand">
                    Mês
                  </th>
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row) => (
                  <tr key={row.person.id} className="border-b border-border-soft last:border-b-0">
                    <td className="px-5 py-4 font-medium text-ink">{row.person.nome}</td>
                    {row.weeks.map((minutes, index) => (
                      <td key={index} className="px-3 py-4 text-center text-ink-soft">
                        {formatWorkloadCell(minutes)}
                      </td>
                    ))}
                    <td className="border-l border-border-soft px-5 py-4 text-center font-medium text-ink">
                      {formatWorkloadCell(row.monthNetMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!grid.hasScheduledHours && (
            <div className="border-t border-border-soft px-5 py-4 text-[13px] text-ink-soft">
              Nenhuma escala registrada em {monthLabel.toLowerCase()}.
            </div>
          )}
        </Card>
      )}

      <p className="mt-4 text-[12px] text-ink-faint">
        Semanas começam na segunda-feira. Quando a semana cruza meses, só entram os dias do mês
        selecionado. Plantão e hora extra são corridos, sem desconto de intervalo. Em cada escala
        regular, o intervalo da pessoa é descontado da jornada daquele turno.
      </p>
    </PageContainer>
  );
}
