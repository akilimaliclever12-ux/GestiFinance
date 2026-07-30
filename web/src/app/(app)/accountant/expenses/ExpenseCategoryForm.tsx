"use client";

import { useActionState, useRef, useEffect } from "react";
import { createExpenseCategory } from "@/lib/expenses-actions";
import type { SchoolRef } from "@/lib/data";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export function ExpenseCategoryForm({ schools }: { schools: SchoolRef[] }) {
  const [state, action, pending] = useActionState(createExpenseCategory, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      action={action}
      className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
    >
      <h3 className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        Ajouter une catégorie de dépense
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {schools.length > 1 ? (
          <select name="school_id" className={inputCls + " max-w-48"} required defaultValue="">
            <option value="" disabled>
              École…
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <input type="hidden" name="school_id" value={schools[0]?.id ?? ""} />
        )}
        <input
          name="name"
          className={inputCls + " max-w-64"}
          placeholder="Ex. Salaires, Loyer…"
          required
        />
        <button
          disabled={pending}
          className="rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-60 dark:hover:bg-brand/10"
        >
          {pending ? "…" : "Ajouter"}
        </button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && <span className="text-sm text-emerald-600">{state.success}</span>}
      </div>
    </form>
  );
}
