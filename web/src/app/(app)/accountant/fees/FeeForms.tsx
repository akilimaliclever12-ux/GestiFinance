"use client";

import { useActionState, useState } from "react";
import { createFeeType, createFeeSchedule } from "../actions";
import { useToastOnSuccess } from "@/components/Toast";
import { cardCls } from "@/lib/ui";
import { CLASSES } from "@/lib/classes";
import type { SchoolRef } from "@/lib/data";
import type { CurrencyCode } from "@/lib/types";
import { useI18n } from "@/i18n/client";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

const CURRENCIES: CurrencyCode[] = ["CDF", "USD", "BIF"];

export interface FeeTypeRef {
  id: string;
  name: string;
  currency: CurrencyCode;
  school_id: string;
}

export function FeeTypeForm({ schools }: { schools: SchoolRef[] }) {
  const [state, action, pending] = useActionState(createFeeType, null);
  useToastOnSuccess(state);
  const tf = useI18n().t.accountant.fees;
  return (
    <form
      action={action}
      className={cardCls}
    >
      <h2 className="mb-3 text-sm font-semibold">{tf.newType}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {schools.length > 1 ? (
          <select name="school_id" className={inputCls} required defaultValue="">
            <option value="" disabled>
              {tf.schoolPh}
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
        <input name="name" placeholder={tf.namePh} className={inputCls} required />
        <select name="currency" className={inputCls} defaultValue="CDF">
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "…" : tf.createType}
        </button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && <span className="text-sm text-emerald-600">{state.success}</span>}
      </div>
    </form>
  );
}

export function FeeScheduleForm({ feeTypes }: { feeTypes: FeeTypeRef[] }) {
  const [state, action, pending] = useActionState(createFeeSchedule, null);
  useToastOnSuccess(state);
  const tf = useI18n().t.accountant.fees;
  const [schoolId, setSchoolId] = useState(feeTypes[0]?.school_id ?? "");

  if (feeTypes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        {tf.createTypeFirst}
      </p>
    );
  }

  return (
    <form
      action={action}
      className={cardCls}
    >
      <h2 className="mb-3 text-sm font-semibold">{tf.newSchedule}</h2>
      <input type="hidden" name="school_id" value={schoolId} />
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          name="fee_type_id"
          className={inputCls}
          required
          defaultValue={feeTypes[0]?.id}
          onChange={(e) => {
            const ft = feeTypes.find((f) => f.id === e.target.value);
            if (ft) setSchoolId(ft.school_id);
          }}
        >
          {feeTypes.map((ft) => (
            <option key={ft.id} value={ft.id}>
              {ft.name} ({ft.currency})
            </option>
          ))}
        </select>
        <select name="class_name" className={inputCls} defaultValue="">
          <option value="">{tf.allClassesOption}</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          name="amount_expected"
          type="number"
          min="0"
          step="0.01"
          placeholder={tf.amountPh}
          className={inputCls}
          required
        />
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">
            {tf.dueLabel}
          </span>
          <input name="due_date" type="date" className={`w-full ${inputCls}`} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "…" : tf.addSchedule}
        </button>
        <span className="text-xs text-neutral-500">
          {tf.scheduleHint}
        </span>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && <span className="text-sm text-emerald-600">{state.success}</span>}
      </div>
    </form>
  );
}
