import { useRef, useState } from "react";
import { Share2, Image as ImageIcon, FileText, Loader2 } from "lucide-react";
import { exportNodeAsImage, exportNodeAsPdf } from "../lib/export";

export default function ExportButton({ targetRef, filenameBase, title }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  async function handleExport(kind) {
    if (!targetRef.current) return;
    setOpen(false);
    setLoading(true);
    try {
      const options = { title: title || filenameBase };
      if (kind === "png") {
        await exportNodeAsImage(targetRef.current, `${filenameBase}.png`, options);
      } else {
        await exportNodeAsPdf(targetRef.current, `${filenameBase}.pdf`, options);
      }
    } catch (err) {
      console.error("Falha ao exportar:", err);
      alert("Não foi possível gerar o arquivo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-surface-3 px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-border disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {loading ? "Gerando..." : "Compartilhar"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-lg border border-border-soft bg-surface-2 shadow-xl">
            <button
              onClick={() => handleExport("png")}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-surface-3"
            >
              <ImageIcon className="h-4 w-4 text-ink-soft" />
              Baixar como imagem
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-surface-3"
            >
              <FileText className="h-4 w-4 text-ink-soft" />
              Baixar como PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
