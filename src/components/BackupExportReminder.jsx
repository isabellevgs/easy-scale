import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

const REMINDER_INTERVAL_MS = 10 * 60 * 1000;
const AUTO_DISMISS_MS = 60 * 1000;

function useBackupReminder() {
  const [visible, setVisible] = useState(false);
  const showTimeoutRef = useRef(null);
  const autoDismissTimeoutRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (autoDismissTimeoutRef.current) {
      window.clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }
  }, []);

  const scheduleReminder = useCallback(() => {
    clearTimers();
    showTimeoutRef.current = window.setTimeout(() => {
      setVisible(true);
      autoDismissTimeoutRef.current = window.setTimeout(() => {
        setVisible(false);
        autoDismissTimeoutRef.current = null;
        scheduleReminder();
      }, AUTO_DISMISS_MS);
    }, REMINDER_INTERVAL_MS);
  }, [clearTimers]);

  const dismiss = useCallback(() => {
    clearTimers();
    setVisible(false);
    scheduleReminder();
  }, [clearTimers, scheduleReminder]);

  useEffect(() => {
    scheduleReminder();
    return clearTimers;
  }, [scheduleReminder, clearTimers]);

  return { visible, dismiss };
}

export default function BackupExportReminder({ exportBackup }) {
  const { visible, dismiss } = useBackupReminder();

  if (!visible) return null;

  function handleExport() {
    exportBackup();
    dismiss();
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-30 border-b border-brand/25 bg-brand-soft/95 px-4 py-3 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <Download className="hidden h-4 w-4 shrink-0 text-brand sm:block" strokeWidth={2.25} />
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink sm:text-[14px]">
          Lembre-se de exportar seu backup para não perder os dados deste dispositivo.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-base transition-[filter] hover:brightness-110 sm:text-[13px]"
        >
          Exportar
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
          aria-label="Fechar lembrete"
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
