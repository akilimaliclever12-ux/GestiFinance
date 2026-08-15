"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastType = "success" | "error";
interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

const ToastCtx = createContext<{
  show: (msg: string, type?: ToastType) => void;
} | null>(null);

export function useToast() {
  const c = useContext(ToastCtx);
  return c ?? { show: () => {} };
}

/** Affiche un toast de succès quand l'état d'un useActionState passe en succès. */
export function useToastOnSuccess(state: { success?: string } | null) {
  const { show } = useToast();
  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [state, show]);
}

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((msg: string, type: ToastType = "success") => {
    const id = ++seq;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur transition ${
              t.type === "success"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300"
                : "border-red-200 bg-red-50/95 text-red-800 dark:border-red-800 dark:bg-red-950/90 dark:text-red-300"
            }`}
          >
            <span aria-hidden className="text-base leading-none">
              {t.type === "success" ? "✓" : "⚠"}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
