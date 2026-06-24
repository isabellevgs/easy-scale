import { useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Settings2, RotateCcw, Download, Upload, HardDriveDownload, UsersRound, CalendarDays, Trash2, Plus } from "lucide-react";
import { Button, Card, Field, inputClass, Modal } from "../components/ui";
import { useShifts } from "../context/ShiftsContext";
import { DEFAULT_SHIFT_TIMES, SHIFT_IDS } from "../lib/shifts";
import { isDefaultShiftNeeds, isShiftNeedEditable, shiftNeedDisabledReason, FERIADO_DAY_INDEX } from "../lib/shiftNeeds";
import { WEEKDAY_LABELS_FULL } from "../lib/constants";
import { describeBackupContents, readBackupFile } from "../lib/backup";
import { toISODate } from "../lib/schedule";
import PageContainer from "../components/PageContainer";

export default function SettingsPage({
  people,
  rules,
  shiftTimes,
  shiftNeeds,
  holidays,
  updateShiftTimes,
  resetShiftTimes,
  updateShiftNeeds,
  resetShiftNeeds,
  addHoliday,
  removeHoliday,
  exportBackup,
  importBackup,
}) {
  const { shifts } = useShifts();
  const fileInputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [newHoliday, setNewHoliday] = useState("");
  const [holidayError, setHolidayError] = useState("");

  const summary = describeBackupContents({ people, rules, shiftTimes });

  function flashSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function handleChange(shiftId, field, value) {
    updateShiftTimes({
      ...shiftTimes,
      [shiftId]: {
        ...shiftTimes[shiftId],
        [field]: value,
      },
    });
    flashSaved();
  }

  function handleNeedChange(dayIndex, shiftId, value) {
    if (!isShiftNeedEditable(dayIndex, shiftId)) return;
    const parsed = Math.max(0, Math.min(99, Number.parseInt(value, 10) || 0));
    updateShiftNeeds(
      shiftNeeds.map((day, index) =>
        index === dayIndex ? { ...day, [shiftId]: parsed } : day
      )
    );
    flashSaved();
  }

  function handleResetNeeds() {
    resetShiftNeeds();
    flashSaved();
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
    addHoliday(newHoliday);
    setNewHoliday("");
    setHolidayError("");
    flashSaved();
  }

  function handleRemoveHoliday(dateISO) {
    removeHoliday(dateISO);
    flashSaved();
  }

  function handleReset() {
    resetShiftTimes();
    flashSaved();
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
      await importBackup(pendingFile);
      setPendingFile(null);
      setPendingPreview(null);
      flashSaved();
    } catch (err) {
      setImportError(err?.message || "Não foi possível importar o backup.");
    } finally {
      setImporting(false);
    }
  }

  const isDefault = SHIFT_IDS.every(
    (id) =>
      shiftTimes[id].start === DEFAULT_SHIFT_TIMES[id].start &&
      shiftTimes[id].end === DEFAULT_SHIFT_TIMES[id].end
  );
  const isNeedsDefault = isDefaultShiftNeeds(shiftNeeds);

  const groupedHolidays = useMemo(() => {
    const todayISO = toISODate(new Date());
    const upcoming = holidays.filter((dateISO) => dateISO >= todayISO).sort();
    const past = holidays.filter((dateISO) => dateISO < todayISO).sort().reverse();
    return { upcoming, past };
  }, [holidays]);

  const needDayRows = [
    ...WEEKDAY_LABELS_FULL.map((label, dayIndex) => ({ label, dayIndex })),
    { label: "Feriado", dayIndex: FERIADO_DAY_INDEX },
  ];

  return (
    <PageContainer size="narrow">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Configurações</h1>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            Horários dos turnos, necessidade de pessoas, backup e restauração dos dados salvos neste
            dispositivo.
          </p>
        </div>
        {saved && (
          <span className="rounded-full bg-good/15 px-3 py-1 text-[12px] font-medium text-good">
            Salvo
          </span>
        )}
      </div>

      <Card className="mb-5 px-5 py-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <HardDriveDownload className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Backup dos dados</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              Exporte ou importe um arquivo JSON com equipe, escalas, horários, feriados e
              necessidade por turno.
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
            </span>{" "}
            e horários personalizados
            {holidays.length > 0 && (
              <>
                ,{" "}
                <span className="font-medium text-ink">
                  {holidays.length} feriado{holidays.length !== 1 ? "s" : ""}
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

        {importError && (
          <p className="mt-3 text-[13px] text-bad">{importError}</p>
        )}

        <p className="mt-4 text-[12px] text-ink-faint">
          O arquivo baixado terá o nome{" "}
          <span className="text-ink-soft">easyscale-backup-AAAA-MM-DD.json</span>. Guarde-o para
          transferir para outro dispositivo ou recuperar depois.
        </p>
      </Card>

      <h2 className="mb-3 text-[15px] font-semibold text-ink">Horários dos turnos</h2>

      <Card className="divide-y divide-border-soft">
        {shifts.map((shift) => {
          const Icon = shift.icon;
          const slot = shiftTimes[shift.id];

          return (
            <div key={shift.id} className="px-5 py-4">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: shift.soft, color: shift.color }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-ink">{shift.label}</p>
                  <p className="text-[12px] text-ink-faint">{shift.time}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Início">
                  <input
                    type="time"
                    className={inputClass}
                    value={slot.start}
                    onChange={(e) => handleChange(shift.id, "start", e.target.value)}
                  />
                </Field>
                <Field label="Fim">
                  <input
                    type="time"
                    className={inputClass}
                    value={slot.end}
                    onChange={(e) => handleChange(shift.id, "end", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] text-ink-faint">
          <Settings2 className="h-3.5 w-3.5" />
          As alterações são salvas automaticamente neste dispositivo.
        </p>
        <Button variant="secondary" onClick={handleReset} disabled={isDefault}>
          <RotateCcw className="h-4 w-4" />
          Restaurar horários padrão
        </Button>
      </div>

      <div className="mb-3 mt-8 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <CalendarDays className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Feriados</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Escalas semanais não se aplicam nessas datas. No calendário mensal, a meta de pessoas
            usa a linha Feriado da tabela abaixo.
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
            Segunda a sexta: meta em Manhã, Tarde e Noite. Fim de semana e linha Feriado: meta em
            FDS/Feriado.
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
                {shifts.map((shift) => {
                  const Icon = shift.icon;
                  return (
                    <th
                      key={shift.id}
                      className="px-2 pb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
                    >
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium normal-case tracking-normal"
                        style={{ background: shift.soft, color: shift.color }}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                        {shift.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {needDayRows.map(({ label, dayIndex }) => (
                <tr key={label} className="border-b border-border-soft last:border-b-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">{label}</td>
                  {shifts.map((shift) => {
                    const editable = isShiftNeedEditable(dayIndex, shift.id);
                    const disabledReason = shiftNeedDisabledReason(dayIndex, shift.id);
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
          Isso substituirá todos os dados atuais neste dispositivo: equipe, escalas, horários dos
          turnos, feriados e necessidade por turno.
        </p>
        {pendingPreview && (
          <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-ink-soft">
            Conteúdo do arquivo:{" "}
            <span className="font-medium text-ink">
              {pendingPreview.people} pessoa{pendingPreview.people !== 1 ? "s" : ""}
            </span>
            ,{" "}
            <span className="font-medium text-ink">
              {pendingPreview.rules} escala{pendingPreview.rules !== 1 ? "s" : ""}
            </span>{" "}
            e horários dos turnos.
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
