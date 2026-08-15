"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSchool } from "@/lib/schools-actions";
import { useToastOnSuccess } from "@/components/Toast";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export function SchoolForm() {
  const [state, action, pending] = useActionState(createSchool, null);
  useToastOnSuccess(state);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="mb-3 text-sm font-semibold">Nouvelle école</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" className={inputCls} placeholder="Nom de l'école *" required />
        <input name="address" className={inputCls} placeholder="Adresse / ville" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Ajout…" : "Ajouter l'école"}
        </button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && <span className="text-sm text-emerald-600">{state.success}</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Pensez ensuite à rattacher vos comptables à cette école (onglet Personnel).
      </p>
    </form>
  );
}
