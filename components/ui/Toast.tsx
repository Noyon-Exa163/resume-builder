"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import "./Toast.css";

export type ToastType = "success" | "error" | "info" | "loading";

export interface Toast {
  id: string;
  title?: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

const TOAST_LIMIT = 5;
const TOAST_DURATION_MS = 4000;
const EXIT_MS = 200;

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const toastTypeIcon: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
  loading: <Loader2 size={16} className="toast__icon--spin" />,
};

type ToastContextValue = {
  toasts: Toast[];
  toast: (props: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  const addToast = useCallback(
    ({ title, message, type = "info", duration }: Omit<Toast, "id">) => {
      const id = genId();
      const newToast: Toast = { id, title, message, type, duration };

      setToasts((prev) => [...prev, newToast].slice(-TOAST_LIMIT));

      setTimeout(() => {
        setExiting((prev) => new Set([...prev, id]));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          setExiting((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, EXIT_MS);
      }, duration ?? TOAST_DURATION_MS);

      return id;
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setExiting((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, EXIT_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast: addToast, dismiss: removeToast }}>
      {children}
      <div className="toasts" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.type} ${exiting.has(t.id) ? "toast--exiting" : ""}`}
            role="alert"
            aria-atomic="true"
          >
            <span className="toast__icon">{toastTypeIcon[t.type]}</span>
            <div className="toast__content">
              {t.title && <div className="toast__title">{t.title}</div>}
              {t.message && <div className="toast__message">{t.message}</div>}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss"
              onClick={() => removeToast(t.id)}
            >
              <span className="sr-only">Dismiss</span>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export default ToastProvider;
