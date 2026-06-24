import { cloneElement, isValidElement, useId } from "react";
import { useShifts } from "../hooks/useShifts";

export function ShiftBadge({ shiftId, size = "md", count }) {
  const { shiftsById } = useShifts();
  const shift = shiftsById[shiftId];
  if (!shift) return null;
  const sizes = {
    sm: count != null ? "min-h-5 px-2 py-0.5 text-[10px]" : "h-5 px-1.5 text-[10px]",
    md: count != null ? "min-h-6 px-2.5 py-1 text-[11px]" : "h-6 px-2 text-[11px]",
  };
  const label =
    count != null
      ? `${shift.label} - ${count} pessoa${count !== 1 ? "s" : ""}`
      : shift.label;
  const title =
    count != null
      ? `${shift.label} · ${shift.time} · ${count} pessoa${count !== 1 ? "s" : ""}`
      : `${shift.label} · ${shift.time}`;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]}`}
      style={{ background: shift.soft, color: shift.color }}
      title={title}
    >
      {label}
    </span>
  );
}

export function PersonAvatar({ nome, color, size = 32 }) {
  const initials = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-base"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.38,
        color: "#0c0d10",
      }}
    >
      {initials || "?"}
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-[14px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5";
  const variants = {
    primary: "bg-brand text-base hover:brightness-110",
    secondary: "bg-surface-3 text-ink hover:bg-border",
    ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
    danger: "bg-bad/15 text-bad hover:bg-bad/25",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function IconButton({ variant = "ghost", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed h-9 w-9";
  const variants = {
    ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
    danger: "text-ink-faint hover:bg-bad/15 hover:text-bad",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-border-soft bg-surface ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-md" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className={`flex max-h-[calc(100dvh-2rem)] w-full ${width} flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface-2 p-5 shadow-2xl`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-surface-3 hover:text-ink"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? (
            <div className="mt-4 shrink-0 border-t border-border-soft pt-4">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint, htmlFor }) {
  const autoId = useId();
  const canAssociate =
    isValidElement(children) && typeof children.type === "string" && children.type === "input";
  const inputId = htmlFor ?? (canAssociate ? children.props.id ?? autoId : undefined);

  return (
    <div className="mb-3.5 block">
      {inputId ? (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          {label}
        </label>
      ) : (
        <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      )}
      {canAssociate ? cloneElement(children, { id: inputId }) : children}
      {hint && <span className="mt-1 block text-[12px] text-ink-faint">{hint}</span>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";
