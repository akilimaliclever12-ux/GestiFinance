"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createStaff } from "@/lib/staff-actions";
import { useToastOnSuccess } from "@/components/Toast";
import type { SchoolRef } from "@/lib/data";
import { useI18n } from "@/i18n/client";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export function StaffForm({ schools }: { schools: SchoolRef[] }) {
  const [state, action, pending] = useActionState(createStaff, null);
  useToastOnSuccess(state);
  const { t } = useI18n();
  const tf = t.owner.staff.form;
  const [role, setRole] = useState<"accountant" | "controller">("accountant");
  const formRef = useRef<HTMLFormElement>(null);

  // Après une création réussie : rôle remis à « comptable » (ajusté au rendu,
  // sans effet) et champs du formulaire vidés (DOM, dans l'effet).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setRole("accountant");
  }
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="mb-3 text-sm font-semibold">{tf.title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="full_name" className={inputCls} placeholder={tf.fullName} required />
        <input name="email" type="email" className={inputCls} placeholder={tf.email} required />
        <input
          name="password"
          type="password"
          className={inputCls}
          placeholder={tf.password}
          minLength={6}
          required
          autoComplete="new-password"
        />
        <select
          name="role"
          className={inputCls}
          value={role}
          onChange={(e) => setRole(e.target.value as "accountant" | "controller")}
        >
          <option value="accountant">{tf.roleAccountant}</option>
          <option value="controller">{tf.roleController}</option>
        </select>
      </div>

      {role === "accountant" && (
        <div className="mt-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
          <p className="mb-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {tf.permissions}
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="can_payments" defaultChecked className="accent-[var(--color-brand)]" />
              {tf.permIncome}
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="can_expenses" defaultChecked className="accent-[var(--color-brand)]" />
              {tf.permExpenses}
            </label>
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1 text-xs text-neutral-500">{tf.schools}</p>
        <div className="flex flex-wrap gap-3">
          {schools.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="school_ids" value={s.id} className="accent-[var(--color-brand)]" />
              {s.name}
            </label>
          ))}
          {schools.length === 0 && (
            <span className="text-sm text-neutral-500">{tf.noSchools}</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? tf.creating : tf.submit}
        </button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        {tf.hint}
      </p>
    </form>
  );
}
