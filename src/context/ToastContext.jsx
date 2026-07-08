import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let idCounter = 0;

/**
 * Global toast provider. Wrap the app with <ToastProvider> once (in main.jsx
 * or App.jsx) and call useToast() anywhere to fire a toast:
 *
 *   const toast = useToast();
 *   toast.success("Rental saved");
 *   toast.error("Could not delete tenant");
 *   toast.info("Invoice generated");
 *   toast.warning("This tenant has an overdue balance");
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const api = {
    show: push,
    success: (message, opts) => push(message, { ...opts, type: "success" }),
    error: (message, opts) => push(message, { ...opts, type: "error", duration: opts?.duration ?? 6000 }),
    warning: (message, opts) => push(message, { ...opts, type: "warning" }),
    info: (message, opts) => push(message, { ...opts, type: "info" }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={18} className="toast-icon" />
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}

      <style>{`
        .toast-viewport {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 3000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 380px;
          width: calc(100% - 32px);
        }

        @media (max-width: 640px) {
          .toast-viewport {
            top: auto;
            bottom: calc(80px + env(safe-area-inset-bottom, 0));
            left: 16px;
            right: 16px;
            max-width: none;
          }
        }

        .toast {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 14px;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
          border-left: 4px solid #64748b;
          font-size: 14px;
          color: #0f172a;
          animation: toast-in 0.25s ease-out;
        }

        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .toast-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .toast-message {
          flex: 1;
          line-height: 1.4;
          word-break: break-word;
        }

        .toast-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          flex-shrink: 0;
          padding: 2px;
          border-radius: 6px;
        }

        .toast-close:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .toast-success { border-left-color: #22c55e; }
        .toast-success .toast-icon { color: #22c55e; }

        .toast-error { border-left-color: #ef4444; }
        .toast-error .toast-icon { color: #ef4444; }

        .toast-warning { border-left-color: #f59e0b; }
        .toast-warning .toast-icon { color: #f59e0b; }

        .toast-info { border-left-color: #2563eb; }
        .toast-info .toast-icon { color: #2563eb; }
      `}</style>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used within a <ToastProvider>");
  }
  return ctx;
}
