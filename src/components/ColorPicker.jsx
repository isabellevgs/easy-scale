import { useCallback, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { normalizeHexColor, personColorError } from "../lib/constants";
import { DEFAULT_PICKER_HSV, hexToHsv, hsvToHex } from "../lib/color";
import { inputClass } from "./ui";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function useDrag(onMove) {
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  return useCallback((event, rect) => {
    onMoveRef.current(event, rect);

    function onPointerMove(moveEvent) {
      onMoveRef.current(moveEvent, rect);
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, []);
}

function draftFromValue(value, fallbackColor) {
  const committed = normalizeHexColor(value);
  if (committed) {
    return { hex: committed, hsv: hexToHsv(committed) };
  }
  const fallback = normalizeHexColor(fallbackColor);
  if (fallback) {
    return { hex: fallback, hsv: hexToHsv(fallback) };
  }
  return {
    hex: hsvToHex(DEFAULT_PICKER_HSV.h, DEFAULT_PICKER_HSV.s, DEFAULT_PICKER_HSV.v),
    hsv: DEFAULT_PICKER_HSV,
  };
}

export default function ColorPicker({ value, onChange, error, fallbackColor = "#5e636e" }) {
  const initialDraft = draftFromValue(value, fallbackColor);
  const [draftHsv, setDraftHsv] = useState(initialDraft.hsv);
  const [draftHex, setDraftHex] = useState(initialDraft.hex);

  const svRef = useRef(null);
  const hueRef = useRef(null);
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;
  const displayHex = normalizeHexColor(value) || normalizeHexColor(draftHex);
  const swatchColor =
    displayHex || hsvToHex(draftHsv.h, draftHsv.s, draftHsv.v) || fallbackColor;
  const hueColor = hsvToHex(draftHsv.h, 100, 100);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emitDraft = useCallback((hex) => {
    onChangeRef.current(hex ?? "");
  }, []);

  function updateDraft(nextHsv) {
    setDraftHsv(nextHsv);
    const hex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
    setDraftHex(hex);
    emitDraft(hex);
  }

  const handleSvMove = useCallback(
    (event, rect) => {
      const s = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
      const v = clamp((1 - (event.clientY - rect.top) / rect.height) * 100, 0, 100);
      setDraftHsv((current) => {
        const next = { ...current, s, v };
        const hex = hsvToHex(next.h, next.s, next.v);
        setDraftHex(hex);
        emitDraft(hex);
        return next;
      });
    },
    [emitDraft]
  );

  const handleHueMove = useCallback(
    (event, rect) => {
      const h = clamp(((event.clientX - rect.left) / rect.width) * 360, 0, 360);
      setDraftHsv((current) => {
        const next = { ...current, h };
        const hex = hsvToHex(next.h, next.s, next.v);
        setDraftHex(hex);
        emitDraft(hex);
        return next;
      });
    },
    [emitDraft]
  );

  const startSvDrag = useDrag(handleSvMove);
  const startHueDrag = useDrag(handleHueMove);

  function handleHexChange(raw) {
    setDraftHex(raw);
    const hex = normalizeHexColor(raw);
    if (!hex) {
      emitDraft(raw.trim() ? raw : "");
      return;
    }
    updateDraft(hexToHsv(hex));
  }

  async function pickFromScreen() {
    if (!hasEyeDropper) return;
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const hex = normalizeHexColor(result.sRGBHex);
      if (!hex) return;
      updateDraft(hexToHsv(hex));
    } catch {
      // usuário cancelou
    }
  }

  const svLeft = `${draftHsv.s}%`;
  const svTop = `${100 - draftHsv.v}%`;
  const hueLeft = `${(draftHsv.h / 360) * 100}%`;
  const formatError =
    draftHex.trim() && !normalizeHexColor(draftHex)
      ? "Informe um código hex válido (ex.: #a855f7)."
      : null;
  const validationError = normalizeHexColor(draftHex) ? personColorError(draftHex) : null;
  const displayError = error || formatError || validationError;

  return (
    <div className="overflow-hidden rounded-xl border border-border-soft bg-surface-2">
      <div className="flex items-center gap-3 border-b border-border-soft px-3 py-2.5">
        <span
          className="h-6 w-6 shrink-0 rounded-md border border-border-soft"
          style={{ background: swatchColor }}
        />
        <span className="font-mono text-[14px] uppercase text-ink">
          {displayHex || draftHex || "Selecionar cor"}
        </span>
      </div>

      <div className="p-3">
        <div
          ref={svRef}
          className="relative h-28 w-full cursor-crosshair overflow-hidden rounded-lg sm:h-32"
          style={{ backgroundColor: hueColor }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const rect = svRef.current?.getBoundingClientRect();
            if (rect) startSvDrag(event, rect);
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <div
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{ left: svLeft, top: svTop, background: swatchColor }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {hasEyeDropper && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                pickFromScreen();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-3 hover:text-ink"
              aria-label="Capturar cor da tela"
              title="Capturar cor da tela"
            >
              <Pipette className="h-4 w-4" />
            </button>
          )}

          <span
            className="h-9 w-9 shrink-0 rounded-full border-2 border-white/20 shadow-inner"
            style={{ background: swatchColor }}
            aria-hidden
          />

          <div
            ref={hueRef}
            className="relative h-3 flex-1 cursor-pointer rounded-full"
            style={{
              background:
                "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              const rect = hueRef.current?.getBoundingClientRect();
              if (rect) startHueDrag(event, rect);
            }}
          >
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
              style={{ left: hueLeft, background: hueColor }}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Hex
          </label>
          <input
            className={`${inputClass} font-mono uppercase`}
            value={draftHex}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#a855f7"
            maxLength={7}
            spellCheck={false}
          />
        </div>
      </div>

      {displayError && <p className="px-3 pb-3 text-[12px] text-bad">{displayError}</p>}
    </div>
  );
}
