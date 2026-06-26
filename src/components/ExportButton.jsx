import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, Image as ImageIcon, FileText, Loader2, CalendarDays } from "lucide-react";
import { exportNodeAsImage, exportNodeAsPdf } from "../lib/export";
import { downloadScheduleIcs, downloadScheduleIcsPerPerson } from "../lib/icalExport";
import { useToast } from "../hooks/useToast";

export default function ExportButton({
  targetRef,
  filenameBase,
  title,
  disabled = false,
  calendarExport,
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const buttonRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }

    function updatePosition() {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function handleExport(kind) {
    setOpen(false);
    setLoading(true);

    try {
      if (kind === "ics") {
        if (!calendarExport) {
          toast.error("Exportação de calendário indisponível.");
          return;
        }

        const count = downloadScheduleIcs(calendarExport);
        toast.success(
          `${count} evento${count !== 1 ? "s" : ""} exportado${count !== 1 ? "s" : ""}. Importe o .ics no Google Calendar.`
        );
        return;
      }

      if (kind === "ics-per-person") {
        if (!calendarExport) {
          toast.error("Exportação de calendário indisponível.");
          return;
        }

        const baseName = calendarExport.filename.replace(/\.ics$/i, "");
        const result = downloadScheduleIcsPerPerson({
          ...calendarExport,
          filename: `${baseName}-agendas.zip`,
        });
        toast.success(
          `${result.personCount} agenda${result.personCount !== 1 ? "s" : ""} exportada${result.personCount !== 1 ? "s" : ""}. Importe cada .ics como uma agenda nova no Google Calendar.`
        );
        return;
      }

      if (disabled || !targetRef?.current) {
        toast.error("Não há conteúdo para compartilhar.");
        return;
      }

      const options = { title: title || filenameBase };
      if (kind === "png") {
        await exportNodeAsImage(targetRef.current, `${filenameBase}.png`, options);
        toast.success("Imagem baixada.");
      } else {
        await exportNodeAsPdf(targetRef.current, `${filenameBase}.pdf`, options);
        toast.success("PDF baixado.");
      }
    } catch (err) {
      console.error("Falha ao exportar:", err);
      toast.error(err?.message || "Não foi possível gerar o arquivo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const menu =
    open &&
    menuStyle &&
    createPortal(
      <>
        <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} aria-hidden="true" />
        <div
          className="fixed z-[101] w-64 overflow-hidden rounded-lg border border-border-soft bg-surface-2 shadow-xl"
          style={{ top: menuStyle.top, right: menuStyle.right }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("png")}
            disabled={disabled}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-surface-3 disabled:opacity-40"
          >
            <ImageIcon className="h-4 w-4 text-ink-soft" />
            Baixar como imagem
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("pdf")}
            disabled={disabled}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-surface-3 disabled:opacity-40"
          >
            <FileText className="h-4 w-4 text-ink-soft" />
            Baixar como PDF
          </button>
          {calendarExport && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport("ics-per-person")}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-surface-3"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-ink-soft" />
                <span>Uma agenda por pessoa (.zip)</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExport("ics")}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-surface-3"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-ink-soft" />
                <span>Todos juntos (.ics)</span>
              </button>
            </>
          )}
        </div>
      </>,
      document.body
    );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !loading && setOpen((value) => !value)}
        disabled={loading}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg bg-surface-3 px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {loading ? "Gerando..." : "Compartilhar"}
      </button>
      {menu}
    </>
  );
}
