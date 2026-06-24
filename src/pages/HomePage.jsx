import { Link } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange, CalendarDays, Users, ArrowRight } from "lucide-react";
import { Card, PersonAvatar } from "../components/ui";
import ScheduleInconsistencies from "../components/ScheduleInconsistencies";
import { formatMonthPeriodLabel } from "../lib/consistencyRules";
import { getOccurrences, toISODate } from "../lib/schedule";
import { colorForPerson, MONTH_LABELS, peopleScheduledIn } from "../lib/constants";
import { getApplicableShiftIdsForDate } from "../lib/shiftNeeds";
import { useShifts } from "../hooks/useShifts";
import PageContainer from "../components/PageContainer";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HomePage({
  people,
  rules,
  holidays = [],
  consistencyRules,
  onSaveConsistencyRules,
}) {
  const { shifts, shiftsById } = useShifts();
  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);
  const shiftIds = useMemo(() => shifts.map((shift) => shift.id), [shifts]);

  const monthKeys = useMemo(() => [format(today, "yyyy-MM")], [today]);
  const inconsistencyPeriodLabel = useMemo(
    () => formatMonthPeriodLabel(monthKeys[0]),
    [monthKeys]
  );

  const todayOccurrences = useMemo(
    () => getOccurrences(rules, todayISO, todayISO, holidays),
    [rules, todayISO, holidays]
  );

  const todayShifts = useMemo(() => {
    const applicableIds = new Set(
      getApplicableShiftIdsForDate(todayISO, shiftIds, holidays, shiftsById)
    );
    return shifts.filter((shift) => applicableIds.has(shift.id));
  }, [todayISO, shiftIds, holidays, shifts, shiftsById]);

  const shiftsByPersonToday = useMemo(() => {
    const map = new Map();
    for (const occ of todayOccurrences) {
      if (!map.has(occ.personId)) map.set(occ.personId, new Set());
      map.get(occ.personId).add(occ.shift);
    }
    return map;
  }, [todayOccurrences]);

  const todayPeople = useMemo(
    () => peopleScheduledIn(todayOccurrences, people),
    [todayOccurrences, people]
  );

  const dateLabelRaw = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const dateLabel = dateLabelRaw.charAt(0).toUpperCase() + dateLabelRaw.slice(1);
  const monthLabel = `${MONTH_LABELS[today.getMonth()]} de ${today.getFullYear()}`;

  return (
    <PageContainer>
      <h1 className="text-[24px] font-semibold text-ink">{greeting()}</h1>
      <p className="mt-1 text-[18px] text-ink-soft">
        Aqui está o resumo de {monthLabel.toLowerCase()}.
      </p>
      <p className="mt-3 text-[16px] text-ink-faint">Hoje, {dateLabel}</p>

      <Card className="mt-6 overflow-hidden">
        <div className="px-6 py-6">
          <>
            <h2 className="text-[16px] font-semibold text-ink">Quem trabalha hoje</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border-soft">
                    <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      Pessoas
                    </th>
                    {todayShifts.map((shift) => {
                      const count = todayOccurrences.filter((occ) => occ.shift === shift.id).length;
                      return (
                        <th
                          key={shift.id}
                          className="px-3 pb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium normal-case tracking-normal"
                              style={{ background: shift.soft, color: shift.color }}
                            >
                              {shift.label}
                            </span>
                            <span className="text-[10px] font-normal normal-case text-ink-faint">
                              {count} pessoa{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {todayPeople.length === 0 ? (
                    <tr>
                      <td
                        colSpan={todayShifts.length + 1}
                        className="py-4 text-center text-[14px] text-ink-soft"
                      >
                        Ninguém escalado ainda
                      </td>
                    </tr>
                  ) : (
                    todayPeople.map((person) => {
                      const personShifts = shiftsByPersonToday.get(person.id);
                      return (
                        <tr key={person.id} className="border-b border-border-soft last:border-b-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar
                                nome={person.nome}
                                color={colorForPerson(person.id, people)}
                                size={28}
                              />
                              <span className="font-medium text-ink">{person.nome}</span>
                            </div>
                          </td>
                          {todayShifts.map((shift) => {
                            const active = personShifts?.has(shift.id);
                            return (
                              <td key={shift.id} className="px-3 py-3 text-center">
                                {active ? (
                                  <span
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                                    style={{ background: shift.soft, color: shift.color }}
                                    title={`${person.nome} · ${shift.label}`}
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ background: shift.color }}
                                    />
                                  </span>
                                ) : (
                                  <span className="text-[13px] text-ink-faint/25">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/semana"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-medium text-base hover:brightness-110"
            >
              Ver escala da semana
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/equipe"
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-border"
            >
              Gerenciar equipe
            </Link>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          to="/equipe"
          icon={Users}
          title="Equipe"
          value={`${people.length} pessoa${people.length !== 1 ? "s" : ""} cadastrada${people.length !== 1 ? "s" : ""}`}
        />
        <StatCard to="/semana" icon={CalendarRange} title="Escala semanal" value="Visão por dia da semana" />
        <StatCard to="/mes" icon={CalendarDays} title="Escala mensal" value="Calendário completo" />
      </div>

      <ScheduleInconsistencies
        people={people}
        rules={rules}
        holidays={holidays}
        shiftsById={shiftsById}
        consistencyRules={consistencyRules}
        onSaveRules={onSaveConsistencyRules}
        monthKeys={monthKeys}
        periodLabel={inconsistencyPeriodLabel}
      />
    </PageContainer>
  );
}

function StatCard({ to, icon: Icon, title, value }) {
  return (
    <Link to={to} className="block">
      <Card className="h-full px-5 py-4 transition-colors hover:bg-surface-2">
        <Icon className="h-5 w-5 text-brand" strokeWidth={2} />
        <p className="mt-3 text-[14px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] text-ink-soft">{value}</p>
      </Card>
    </Link>
  );
}
