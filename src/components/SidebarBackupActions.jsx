import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button, Modal } from "./ui";
import { describeBackupContents, readBackupFile } from "../lib/backup";
import { useToast } from "./Toast";

function SidebarActionButton({ collapsed, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`flex items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink ${
        collapsed ? "h-9 w-9 justify-center" : "w-full gap-3 px-3 py-2.5 text-[13px]"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export default function SidebarBackupActions({ collapsed, exportBackup, importBackup }) {
  const fileInputRef = useRef(null);
  const toast = useToast();
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const nextState = await readBackupFile(file);
      setPendingFile(file);
      setPendingPreview(describeBackupContents(nextState));
    } catch (err) {
      toast.error(err?.message || "Não foi possível ler o arquivo.");
    }
  }

  async function confirmImport() {
    if (!pendingFile) return;

    setImporting(true);

    try {
      const result = await importBackup(pendingFile);
      if (result?.ok) {
        setPendingFile(null);
        setPendingPreview(null);
        toast.success("Backup importado com sucesso.");
      } else {
        toast.error(result?.error || "Não foi possível importar o backup.");
      }
    } catch (err) {
      toast.error(err?.message || "Não foi possível importar o backup.");
    } finally {
      setImporting(false);
    }
  }

  function closeImportModal() {
    if (importing) return;
    setPendingFile(null);
    setPendingPreview(null);
  }

  return (
    <>
      <div className={`mt-4 flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
        <SidebarActionButton
          collapsed={collapsed}
          label="Exportar backup"
          icon={Download}
          onClick={exportBackup}
        />
        <SidebarActionButton
          collapsed={collapsed}
          label="Importar backup"
          icon={Upload}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      <Modal open={!!pendingFile} onClose={closeImportModal} title="Importar backup">
        <p className="text-[14px] text-ink-soft">
          Isso substituirá todos os dados atuais neste dispositivo: equipe, escalas, turnos, feriados
          e necessidade por turno.
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
            e{" "}
            <span className="font-medium text-ink">
              {pendingPreview.shifts} turno{pendingPreview.shifts !== 1 ? "s" : ""}
            </span>
            .
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeImportModal} disabled={importing}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmImport} disabled={importing}>
            {importing ? "Importando..." : "Substituir dados"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
