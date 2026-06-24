import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ExportFrame({ innerRef, title, subtitle, headerExtra, children }) {
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div ref={innerRef} className="export-capture rounded-2xl">
      <div className="export-capture-header mb-5 border-b border-border-soft pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              EasyScale
            </p>
            <h2 className="mt-1 text-[22px] font-semibold leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}
          </div>
          {headerExtra && (
            <div className="flex flex-wrap items-center justify-end gap-2">{headerExtra}</div>
          )}
        </div>
      </div>

      {children}

      <p className="export-capture-footer mt-4 border-t border-border-soft pt-3 text-[11px] text-ink-faint">
        Gerado em {generatedAt}
      </p>
    </div>
  );
}
