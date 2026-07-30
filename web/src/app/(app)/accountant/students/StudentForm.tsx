"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStudent } from "../actions";
import type { SchoolRef } from "@/lib/data";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export function StudentForm({ schools }: { schools: SchoolRef[] }) {
  const [state, action, pending] = useActionState(createStudent, null);
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
      <h2 className="mb-3 text-sm font-semibold">Nouvel élève</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {schools.length > 1 ? (
          <select name="school_id" className={inputCls} required defaultValue="">
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

        <input name="matricule" placeholder="Matricule *" className={inputCls} required />
        <input name="last_name" placeholder="Nom *" className={inputCls} required />
        <input name="first_name" placeholder="Prénom *" className={inputCls} required />
        <input name="class_name" placeholder="Classe" className={inputCls} />
        <input name="section" placeholder="Section" className={inputCls} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || schools.length === 0}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && (
          <span className="text-sm text-emerald-600">{state.success}</span>
        )}
      </div>
    </form>
  );
}
