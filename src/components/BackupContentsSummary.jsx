export default function BackupContentsSummary({ summary }) {
  if (!summary) return null;

  return (
    <div className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-ink-soft">
      Conteúdo do arquivo:{" "}
      <span className="font-medium text-ink">
        {summary.people} pessoa{summary.people !== 1 ? "s" : ""}
      </span>
      ,{" "}
      <span className="font-medium text-ink">
        {summary.rules} escala{summary.rules !== 1 ? "s" : ""}
      </span>
      ,{" "}
      <span className="font-medium text-ink">
        {summary.shifts} turno{summary.shifts !== 1 ? "s" : ""}
      </span>
      {summary.rulesWithInterval > 0 && (
        <>
          ,{" "}
          <span className="font-medium text-ink">
            {summary.rulesWithInterval} com intervalo
          </span>
        </>
      )}
      {summary.holidays > 0 && (
        <>
          ,{" "}
          <span className="font-medium text-ink">
            {summary.holidays} feriado{summary.holidays !== 1 ? "s" : ""}
          </span>
        </>
      )}
      {summary.consistencyRuleLinks > 0 && (
        <>
          ,{" "}
          <span className="font-medium text-ink">
            {summary.consistencyRulesWithPeople} regra
            {summary.consistencyRulesWithPeople !== 1 ? "s" : ""} de consistência (
            {summary.consistencyRuleLinks} vínculo
            {summary.consistencyRuleLinks !== 1 ? "s" : ""})
          </span>
        </>
      )}
      {summary.timeCoverageRules > 0 && (
        <>
          ,{" "}
          <span className="font-medium text-ink">
            {summary.timeCoverageRules} regra{summary.timeCoverageRules !== 1 ? "s" : ""} de
            horário
          </span>
        </>
      )}
      {summary.includesShiftNeeds && (
        <>
          {" "}
          e necessidade por turno
        </>
      )}
      .
    </div>
  );
}
