import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

const DEFAULT_TITLE = "Mais de um tipo de escala no mesmo turno neste dia";

export default function PersonScaleOverlapIcon({
  className = "h-3.5 w-3.5 shrink-0 text-amber-500",
  title,
}) {
  const label = title ? `Escalas: ${title}` : DEFAULT_TITLE;
  const anchorRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  function showTooltip() {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  return (
    <>
      <span
        ref={anchorRef}
        className="relative z-20 inline-flex shrink-0 cursor-help pointer-events-auto"
        aria-label={label}
        tabIndex={0}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <AlertTriangle className={className} aria-hidden="true" />
      </span>

      {tooltip &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[9999] w-max max-w-[240px] -translate-x-1/2 -translate-y-full rounded-md border border-border-soft bg-ink px-2 py-1 text-center text-[11px] font-medium leading-snug text-base shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
