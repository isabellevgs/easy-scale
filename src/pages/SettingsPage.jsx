import { useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Settings2,
  RotateCcw,
  Download,
  Upload,
  HardDriveDownload,
  UsersRound,
  CalendarDays,
  Trash2,
  Plus,
  Pencil,
} from "lucide-react";
import { Button, Card, inputClass, Modal, IconButton } from "../components/ui";
import ShiftModal from "../components/ShiftModal";
import { usePersist } from "../hooks/usePersist";
import { useShifts } from "../hooks/useShifts";
import { countRulesUsingShift } from "../lib/shifts";
import {
  isDefaultShiftNeeds,
  isShiftNeedEditable,
  shiftNeedDisabledReason,
  FERIADO_DAY_INDEX,
  NEED_DAY_DISPLAY_ORDER,
} from "../lib/shiftNeeds";
import { WEEKDAY_LABELS_FULL } from "../lib/constants";
import { describeBackupContents, readBackupFile } from "../lib/backup";
import BackupContentsSummary from "../components/BackupContentsSummary";
import { toISODate } from "../lib/schedule";
import PageContainer from "../components/PageContainer";

export default function SettingsPage({
  people,
  rules,
  shifts: shiftsConfig,
  shiftNeeds,
  holidays,
  consistencyRules,
  addShift,
  updateShift,
  removeShift,
  resetShifts,
  isDefaultShifts,
  updateShiftNeeds,
  resetShiftNeeds,
  addHoliday,
  removeHoliday,
  exportBackup,
  importBackup,
}) {
  const { shifts, shiftsById } = useShifts();
  const { notifySave, persist } = usePersist();
  const fileInputRef = useRef(null);
  const needSaveGenRef = useRef(0);
  const needSaveTimerRef = useRef(null);
  const [importError, setImportError] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [newHoliday, setNewHoliday] = useState("");
  const [holidayError, setHolidayError] = useState("");
  const [shiftModal, setShiftModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const summary = describeBackupContents({
    people,
    rules,
    shifts: shiftsConfig,
    holidays,
    consistencyRules,
  });

  function handleNeedChange(dayIndex, shiftId, value) {
    if (!isShiftNeedEditable(dayIndex, shiftId, shiftsById)) return;
    const parsed = Math.max(0, Math.min(99, Number.parseInt(value, 10) || 0));
    const generation = ++needSaveGenRef.current;

    updateShiftNeeds(
      shiftNeeds.map((day, index) =>
        index === dayIndex ? { ...day, [shiftId]: parsed } : day
      )
    ).then((result) => {
      window.clearTimeout(needSaveTimerRef.current);
      needSaveTimerRef.current = window.setTimeout(() => {
        if (generation !== needSaveGenRef.current) return;
        notifySave(result, "Necessidades salvas.", "Não foi possível salvar as necessidades.");
      }, 600);
    });
  }

  function handleResetNeeds() {
    persist(resetShiftNeeds, "Necessidades restauradas.", "Não foi possível restaurar as necessidades.");
  }

  function handleAddHoliday() {
    if (!newHoliday) {
      setHolidayError("Escolha uma data.");
      return;
    }
    if (holidays.includes(newHoliday)) {
      setHolidayError("Esta data já está cadastrada.");
      return;
    }
    persist(
      () => addHoliday(newHoliday),
      "Feriado adicionado.",
      "Não foi possível salvar o feriado."
    ).then((result) => {
      if (result?.ok) {
        setNewHoliday("");
        setHolidayError("");
      }
    });
  }

  function handleRemoveHoliday(dateISO) {
    persist(
      () => removeHoliday(dateISO),
      "Feriado removido.",
      "Não foi possível remover o feriado."
    );
  }

  function handleResetShifts() {
    persist(resetShifts, "Turnos padrão restaurados.", "Não foi possível restaurar os turnos.");
  }

  function openCreateShift() {
    setShiftModal({ mode: "create" });
  }

  function openEditShift(shift) {
    setShiftModal({
      mode: "edit",
      shift: {
        id: shift.id,
        label: shift.label,
        start: shift.start,
        end: shift.end,
        scope: shift.scope,
      },
    });
  }

  function handleSaveShift(data) {
    const action =
      shiftModal?.mode === "edit"
        ? () => updateShift(shiftModal.shift.id, data)
        : () => addShift(data);
    const successMessage =
      shiftModal?.mode === "edit" ? "Turno atualizado." : "Turno adicionado.";

    persist(action, successMessage, "Não foi possível salvar o turno.").then((result) => {
      if (result?.ok) setShiftModal(null);
    });
  }

  function confirmDeleteShift() {
    if (!deleteTarget) return;
    persist(
      () => removeShift(deleteTarget.id),
      "Turno excluído.",
      "Não foi possível excluir o turno."
    ).then((result) => {
      if (result?.ok) setDeleteTarget(null);
    });
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImportError("");

    try {
      const nextState = await readBackupFile(file);
      setPendingFile(file);
      setPendingPreview(describeBackupContents(nextState));
    } catch (err) {
      setImportError(err?.message || "Não foi possível ler o arquivo.");
    }
  }

  async function confirmImport() {
    if (!pendingFile) return;

    setImporting(true);
    setImportError("");

    try {
      const result = await importBackup(pendingFile);
      if (result?.ok) {
        setPendingFile(null);
        setPendingPreview(null);
        notifySave(result, "Backup importado com sucesso.", "Não foi possível importar o backup.");
      } else {
        setImportError(result?.error || "Não foi possível importar o backup.");
        notifySave(result, "Backup importado com sucesso.", "Não foi possível importar o backup.");
      }
    } catch (err) {
      const message = err?.message || "Não foi possível importar o backup.";
      setImportError(message);
      notifySave({ ok: false, error: message }, "Backup importado com sucesso.", message);
    } finally {
      setImporting(false);
    }
  }

  const isNeedsDefault = isDefaultShiftNeeds(shiftNeeds, shiftsConfig);

  const groupedHolidays = useMemo(() => {
    const todayISO = toISODate(new Date());
    const upcoming = holidays.filter((dateISO) => dateISO >= todayISO).sort();
    const past = holidays.filter((dateISO) => dateISO < todayISO).sort().reverse();
    return { upcoming, past };
  }, [holidays]);

  const needDayRows = NEED_DAY_DISPLAY_ORDER.map((dayIndex) => ({
    label: dayIndex === FERIADO_DAY_INDEX ? "Feriado" : WEEKDAY_LABELS_FULL[dayIndex],
    dayIndex,
  }));

  const deleteUsageCount = deleteTarget ? countRulesUsingShift(rules, deleteTarget.id) : 0;

  return (
    <PageContainer size="narrow">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Configurações</h1>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            Turnos, necessidade de pessoas, backup e restauração dos dados salvos neste dispositivo.
          </p>
        </div>
      </div>

      <Card className="mb-5 px-5 py-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <HardDriveDownload className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Backup dos dados</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              Exporte ou importe um arquivo JSON com equipe, escalas, turnos, feriados, necessidade
              por turno e regras de consistência.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-ink-soft">
          <p>
            Dados atuais:{" "}
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
            {holidays.length > 0 && (
              <>
                ,{" "}
                <span className="font-medium text-ink">
                  {holidays.length} feriado{holidays.length !== 1 ? "s" : ""}
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
            .
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={exportBackup}>
            <Download className="h-4 w-4" />
            Exportar backup
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importar backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        {importError && <p className="mt-3 text-[13px] text-bad">{importError}</p>}

        <p className="mt-4 text-[12px] text-ink-faint">
          O arquivo baixado terá o nome{" "}
          <span className="text-ink-soft">easyscale-backup-AAAA-MM-DD.json</span>. Guarde-o para
          transferir para outro dispositivo ou recuperar depois.
        </p>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Turnos</h2>
        <Button onClick={openCreateShift}>
          <Plus className="h-4 w-4" />
          Adicionar turno
        </Button>
      </div>

      <Card className="divide-y divide-border-soft">
        {shifts.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            Nenhum turno cadastrado. Adicione o primeiro turno para começar.
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">{shift.label}</p>
                  <p className="text-[12px] text-ink-faint">
                    {shift.time} · {shift.scopeLabel}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton onClick={() => openEditShift(shift)} aria-label={`Editar ${shift.label}`}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    variant="danger"
                    onClick={() => setDeleteTarget(shift)}
                    disabled={shifts.length <= 1}
                    aria-label={`Excluir ${shift.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] text-ink-faint">
          <Settings2 className="h-3.5 w-3.5" />
          As alterações são salvas automaticamente neste dispositivo.
        </p>
        <Button variant="secondary" onClick={handleResetShifts} disabled={isDefaultShifts}>
          <RotateCcw className="h-4 w-4" />
          Restaurar turnos padrão
        </Button>
      </div>

      <div className="mb-3 mt-8 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <CalendarDays className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Feriados</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Escalas semanais não se aplicam nessas datas. No calendário mensal, a meta de pessoas usa
            a linha Feriado da tabela abaixo.
          </p>
        </div>
      </div>

      <Card className="mb-5 px-5 py-5">
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">Data do feriado</span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              className={`${inputClass} min-w-[180px] flex-1 sm:max-w-xs`}
              value={newHoliday}
              onChange={(e) => {
                setNewHoliday(e.target.value);
                setHolidayError("");
              }}
            />
            <Button onClick={handleAddHoliday} disabled={!newHoliday} className="shrink-0">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        {holidayError && <p className="mt-2 text-[13px] text-bad">{holidayError}</p>}

        {holidays.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-faint">Nenhum feriado cadastrado.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {groupedHolidays.upcoming.length > 0 && (
              <HolidayListGroup
                title="Por vir"
                dates={groupedHolidays.upcoming}
                onRemove={handleRemoveHoliday}
              />
            )}
            {groupedHolidays.past.length > 0 && (
              <HolidayListGroup
                title="Já passaram"
                dates={groupedHolidays.past}
                onRemove={handleRemoveHoliday}
                muted
              />
            )}
          </div>
        )}
      </Card>

      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <UsersRound className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Necessidade por turno</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Defina quantas pessoas são necessárias em cada turno, por dia da semana e feriados.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden px-3 py-4 sm:px-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border-soft">
                <th className="pb-3 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Dia
                </th>
                {shifts.map((shift) => (
                  <th
                    key={shift.id}
                    className="px-2 pb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
                  >
                    <span
                      className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium normal-case tracking-normal"
                      style={{ background: shift.soft, color: shift.color }}
                    >
                      {shift.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {needDayRows.map(({ label, dayIndex }) => (
                <tr key={label} className="border-b border-border-soft last:border-b-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">{label}</td>
                  {shifts.map((shift) => {
                    const editable = isShiftNeedEditable(dayIndex, shift.id, shiftsById);
                    const disabledReason = shiftNeedDisabledReason(dayIndex, shift.id, shiftsById);
                    return (
                      <td key={shift.id} className="px-2 py-2.5 text-center">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            max={99}
                            inputMode="numeric"
                            className={`${inputClass} mx-auto w-16 text-center tabular-nums`}
                            value={shiftNeeds[dayIndex][shift.id]}
                            onChange={(e) => handleNeedChange(dayIndex, shift.id, e.target.value)}
                            aria-label={`${label}, ${shift.label}`}
                          />
                        ) : (
                          <span
                            className="inline-flex h-[42px] w-16 items-center justify-center rounded-lg bg-surface-2 text-[13px] text-ink-faint/35"
                            title={disabledReason}
                            aria-label={`${label}, ${shift.label}: indisponível`}
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-faint">Use 0 quando não houver necessidade mínima naquele dia.</p>
        <Button variant="secondary" onClick={handleResetNeeds} disabled={isNeedsDefault}>
          <RotateCcw className="h-4 w-4" />
          Zerar necessidades
        </Button>
      </div>

      <ShiftModal
        open={!!shiftModal}
        initial={shiftModal?.mode === "edit" ? shiftModal.shift : null}
        onClose={() => setShiftModal(null)}
        onSave={handleSaveShift}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir turno"
      >
        <p className="text-[14px] text-ink-soft">
          Tem certeza que deseja excluir o turno{" "}
          <span className="font-medium text-ink">{deleteTarget?.label}</span>?
        </p>
        {deleteUsageCount > 0 && (
          <p className="mt-3 text-[13px] text-bad">
            {deleteUsageCount} escala{deleteUsageCount !== 1 ? "s" : ""} usa
            {deleteUsageCount !== 1 ? "m" : ""} este turno e será
            {deleteUsageCount !== 1 ? "ão" : ""} atualizada{deleteUsageCount !== 1 ? "s" : ""}.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDeleteShift}>
            Excluir turno
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!pendingFile}
        onClose={() => {
          if (importing) return;
          setPendingFile(null);
          setPendingPreview(null);
        }}
        title="Importar backup"
      >
        <p className="text-[14px] text-ink-soft">
          Isso substituirá todos os dados atuais neste dispositivo: equipe, escalas, turnos,
          feriados, necessidade por turno e regras de consistência.
        </p>
        {pendingPreview && (
          <div className="mt-3">
            <BackupContentsSummary summary={pendingPreview} />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setPendingFile(null);
              setPendingPreview(null);
            }}
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmImport} disabled={importing}>
            {importing ? "Importando..." : "Substituir dados"}
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}

function formatHolidayLabel(dateISO) {
  const label = format(parseISO(dateISO), "dd/MM/yyyy · EEEE", { locale: ptBR });
  return label.replace(/(^|· )([a-zà-ú])/g, (match, sep, char) => sep + char.toUpperCase());
}

function HolidayListGroup({ title, dates, onRemove, muted = false }) {
  return (
    <div>
      <p
        className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${
          muted ? "text-ink-faint" : "text-ink-soft"
        }`}
      >
        {title}
      </p>
      <ul className="divide-y divide-border-soft rounded-xl border border-border-soft">
        {dates.map((dateISO) => (
          <li
            key={dateISO}
            className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]"
          >
            <span className={muted ? "text-ink-soft" : "text-ink"}>{formatHolidayLabel(dateISO)}</span>
            <button
              type="button"
              onClick={() => onRemove(dateISO)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-bad"
              aria-label={`Remover feriado ${dateISO}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
