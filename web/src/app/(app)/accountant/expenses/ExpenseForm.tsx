"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createExpense } from "@/lib/expenses-actions";
import type { SchoolRef } from "@/lib/data";
import {
  CURRENCIES,
  PAYMENT_METHOD_LABELS,
  type CurrencyCode,
  type PaymentMethod,
} from "@/lib/types";

export interface CategoryRef {
  id: string;
  name: string;
  school_id: string;
}

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export function ExpenseForm({
  schools,
  categories,
  defaultCurrency,
  today,
}: {
  schools: SchoolRef[];
  categories: CategoryRef[];
  defaultCurrency: CurrencyCode;
  today: string;
}) {
  const [state, action, pending] = useActionState(createExpense, null);
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  const cats = categories.filter((c) => c.school_id === schoolId);
  const methods = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="mb-3 text-sm font-semibold">Nouvelle dépense</h2>

      {schools.length > 1 ? (
        <div className="mb-3">
          <label className="mb-1 block text-xs text-neutral-500">École *</label>
          <select
            name="school_id"
            className={inputCls}
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            required
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="school_id" value={schoolId} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Catégorie</label>
          <select name="category_id" className={inputCls} defaultValue="">
            <option value="">— (non classée)</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Bénéficiaire</label>
          <input name="beneficiary" className={inputCls} placeholder="À qui ?" />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Mode de paiement</label>
          <select name="payment_method" className={inputCls} defaultValue="cash">
            {methods.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Montant *</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Devise *</label>
          <select name="currency" className={inputCls} defaultValue={defaultCurrency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Date *</label>
          <input name="paid_at" type="date" className={inputCls} defaultValue={today} required />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">N° de pièce</label>
          <input name="reference" className={inputCls} placeholder="Facture / reçu" />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Note</label>
          <input name="note" className={inputCls} placeholder="Optionnel" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || schools.length === 0}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer la dépense"}
        </button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && <span className="text-sm text-emerald-600">{state.success}</span>}
      </div>
    </form>
  );
}
