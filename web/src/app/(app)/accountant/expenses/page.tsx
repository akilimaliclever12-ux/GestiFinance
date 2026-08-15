"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { useOffline } from "@/lib/offline/OfflineProvider";
import {
  listSchools,
  listCategories,
  listRecentExpenses,
  createExpenseLocal,
  createExpenseCategoryLocal,
} from "@/lib/offline/repo";
import {
  CURRENCIES,
  PAYMENT_METHOD_LABELS,
  type CurrencyCode,
  type PaymentMethod,
} from "@/lib/types";
import { cardCls, tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";
const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export default function ExpensesPage() {
  const { ctx, flush, perms } = useOffline();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [catMsg, setCatMsg] = useState<{ ok?: string; err?: string }>({});

  const schools = useLiveQuery(() => listSchools(), [], []);
  const categories = useLiveQuery(() => listCategories(), [], []);
  const recent = useLiveQuery(() => listRecentExpenses(), [], []);
  const defCur = useLiveQuery(() => db.meta.get("defaultCurrency"), [], undefined);
  const defaultCurrency = (defCur?.value as CurrencyCode) ?? "CDF";

  const [schoolId, setSchoolId] = useState<string>("");
  const effSchool = schoolId || schools[0]?.id || "";
  const cats = categories.filter((c) => c.school_id === effSchool);
  const methods = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg({});
    const f = new FormData(e.currentTarget);
    const res = await createExpenseLocal(ctx, {
      school_id: effSchool,
      category_id: String(f.get("category_id") || "") || null,
      beneficiary: String(f.get("beneficiary") || "").trim() || null,
      amount: Number(f.get("amount") || 0),
      currency: String(f.get("currency") || defaultCurrency) as CurrencyCode,
      payment_method: (String(f.get("payment_method") || "") || null) as PaymentMethod | null,
      reference: String(f.get("reference") || "").trim() || null,
      paid_at: String(f.get("paid_at") || today),
      note: String(f.get("note") || "").trim() || null,
    });
    if (res.error) setMsg({ err: res.error });
    else {
      setMsg({ ok: "Dépense enregistrée." });
      e.currentTarget.reset();
      void flush();
    }
  }

  async function onAddCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCatMsg({});
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const school = String(f.get("school_id") || effSchool);
    if (!name || !school) return setCatMsg({ err: "École et intitulé requis." });
    const res = await createExpenseCategoryLocal(ctx, { school_id: school, name });
    if (res.error) setCatMsg({ err: res.error });
    else {
      setCatMsg({ ok: `Catégorie « ${name} » créée.` });
      e.currentTarget.reset();
      void flush();
    }
  }

  if (!perms.canExpenses) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        Vous n&apos;êtes pas autorisé à enregistrer les dépenses. Contactez le
        promoteur.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dépenses (livre de caisse)</h1>
        <p className="text-sm text-neutral-500">
          Enregistrez les sorties. Fonctionne hors-ligne : tout se synchronise au
          retour du réseau.
        </p>
      </div>

      <form onSubmit={onSubmit} className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold">Nouvelle dépense</h2>
        {schools.length > 1 && (
          <div className="mb-3">
            <label className="mb-1 block text-xs text-neutral-500">École *</label>
            <select
              className={inputCls}
              value={effSchool}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select name="category_id" className={inputCls} defaultValue="">
            <option value="">Catégorie — (non classée)</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="beneficiary" className={inputCls} placeholder="Bénéficiaire" />
          <select name="payment_method" className={inputCls} defaultValue="cash">
            {methods.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          <input name="amount" type="number" min="0" step="0.01" className={inputCls} placeholder="Montant *" required />
          <select name="currency" className={inputCls} defaultValue={defaultCurrency} key={defaultCurrency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input name="paid_at" type="date" className={inputCls} defaultValue={today} required />
          <input name="reference" className={inputCls} placeholder="N° de pièce" />
          <input name="note" className={inputCls + " lg:col-span-2"} placeholder="Note (optionnel)" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={!effSchool}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            Enregistrer la dépense
          </button>
          {msg.err && <span className="text-sm text-red-600">{msg.err}</span>}
          {msg.ok && <span className="text-sm text-emerald-600">{msg.ok}</span>}
        </div>
      </form>

      <form
        onSubmit={onAddCategory}
        className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
      >
        <h3 className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          Ajouter une catégorie de dépense
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {schools.length > 1 && (
            <select name="school_id" className={inputCls + " max-w-48"} defaultValue={effSchool}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <input name="name" className={inputCls + " max-w-64"} placeholder="Ex. Salaires, Loyer…" required />
          <button className="rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brand hover:bg-brand-light dark:hover:bg-brand/10">
            Ajouter
          </button>
          {catMsg.err && <span className="text-sm text-red-600">{catMsg.err}</span>}
          {catMsg.ok && <span className="text-sm text-emerald-600">{catMsg.ok}</span>}
        </div>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Dernières dépenses
        </h2>
        <div className="overflow-x-auto">
          <table className={`${tableCls} min-w-[680px]`}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Catégorie</th>
                <th className={thCls}>Bénéficiaire</th>
                <th className={thCls}>Montant</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {(recent ?? []).map((e) => {
                const cat = categories.find((c) => c.id === e.category_id);
                return (
                  <tr key={e.id} className={`${rowCls} ${e.cancelled ? "opacity-50" : ""}`}>
                    <td className={`${tdCls} whitespace-nowrap`}>{e.paid_at}</td>
                    <td className={tdCls}>{cat?.name ?? "—"}</td>
                    <td className={tdCls}>{e.beneficiary ?? "—"}</td>
                    <td className={`${tdCls} font-medium text-red-600 dark:text-red-400`}>
                      {money(e.amount, e.currency)}
                      {e.cancelled && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                          Annulée
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!recent || recent.length === 0) && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState>Aucune dépense enregistrée.</EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
