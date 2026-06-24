import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const ToastContext = createContext(null);

function ToastItem({ type, message }) {
  const isSuccess = type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-w-[260px] max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-2xl ${
        isSuccess
          ? "border-good/30 bg-surface-2 text-ink"
          : "border-bad/30 bg-surface-2 text-ink"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" strokeWidth={2.25} />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" strokeWidth={2.25} />
      )}
      <p className="text-[13px] leading-snug">{message}</p>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (type, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const toast = {
    success: (message) => show("success", message),
    error: (message) => show("error", message),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-label="Notificações"
        className="pointer-events-none fixed bottom-20 right-4 z-[100] flex flex-col gap-2 md:bottom-6 md:right-6"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} type={item.type} message={item.message} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
