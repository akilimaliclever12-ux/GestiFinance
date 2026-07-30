"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  searchStudents,
  getStudentFeeContext,
  createPayment,
  type StudentHit,
  type StudentFeeContext,
} from "@/lib/payments-actions";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export function PaymentForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createPayment, null);
  const [dismissed, setDismissed] = useState(false);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [student, setStudent] = useState<StudentHit | null>(null);
  const [ctx, setCtx] = useState<StudentFeeContext | null>(null);
  const [feeTypeId, setFeeTypeId] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedFee = ctx?.fees.find((f) => f.fee_type_id === feeTypeId);

  async function runSearch(value: string) {
    setQuery(value);
    setStudent(null);
    setCtx(null);
    if (value.trim().length >= 1) setHits(await searchStudents(value));
    else setHits([]);
  }

  async function pick(s: StudentHit) {
    setStudent(s);
    setHits([]);
    setQuery(`${s.matricule} — ${s.last_name} ${s.first_name}`);
    setLoading(true);
    const c = await getStudentFeeContext(s.id);
    setCtx(c);
    setFeeTypeId(c?.fees[0]?.fee_type_id ?? "");
    setLoading(false);
  }

  function reset() {
    setDismissed(true);
    setStudent(null);
    setCtx(null);
    setQuery("");
    setHits([]);
    setFeeTypeId("");
  }

  // Écran de succès + reçu
  if (state?.paymentId && !dismissed) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/40">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          ✓ Paiement enregistré.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href={`/receipt/${state.paymentId}`}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Voir / imprimer le reçu
          </Link>
          <button
            onClick={reset}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Enregistrer un autre paiement
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="mb-3 text-sm font-semibold">Enregistrer un paiement</h2>

      {/* Recherche élève */}
      <div className="relative mb-3">
        <label className="mb-1 block text-xs text-neutral-500">Élève *</label>
        <input
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Matricule ou nom…"
          className={inputCls}
          autoComplete="off"
        />
        {hits.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => pick(h)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-light dark:hover:bg-brand/10"
                >
                  <span>
                    {h.last_name} {h.first_name}
                  </span>
                  <span className="font-mono text-xs text-neutral-500">
                    {h.matricule} · {h.class_name ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {student && <input type="hidden" name="student_id" value={student.id} />}

      {loading && <p className="text-sm text-neutral-500">Chargement du solde…</p>}

      {ctx && (
        <>
          {ctx.fees.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              Aucun frais défini pour cette école. Configurez-les dans l&apos;onglet
              Frais.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Type de frais + solde */}
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Type de frais *
                </label>
                <select
                  name="fee_type_id"
                  value={feeTypeId}
                  onChange={(e) => setFeeTypeId(e.target.value)}
                  className={inputCls}
                  required
                >
                  {ctx.fees.map((f) => (
                    <option key={f.fee_type_id} value={f.fee_type_id}>
                      {f.name} ({f.currency})
                    </option>
                  ))}
                </select>
                {selectedFee && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Attendu : {money(selectedFee.total_expected, selectedFee.currency)} ·
                    Payé : {money(selectedFee.total_paid, selectedFee.currency)} ·{" "}
                    <span
                      className={
                        selectedFee.balance > 0
                          ? "font-semibold text-red-600"
                          : "font-semibold text-emerald-600"
                      }
                    >
                      Reste : {money(selectedFee.balance, selectedFee.currency)}
                    </span>
                  </p>
                )}
              </div>

              {/* Banque */}
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Banque</label>
                <select name="bank_id" className={inputCls} defaultValue="">
                  <option value="">—</option>
                  {ctx.banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  N° bordereau
                </label>
                <input name="bordereau_no" className={inputCls} placeholder="Ex. BRD-000123" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Montant * {selectedFee ? `(${selectedFee.currency})` : ""}
                </label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  required
                  defaultValue={
                    selectedFee && selectedFee.balance > 0
                      ? selectedFee.balance
                      : ""
                  }
                  key={feeTypeId}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Date *</label>
                <input
                  name="paid_at"
                  type="date"
                  className={inputCls}
                  defaultValue={today}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Note</label>
                <input name="note" className={inputCls} placeholder="Optionnel" />
              </div>
            </div>
          )}

          {ctx.fees.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {pending ? "Enregistrement…" : "Enregistrer le paiement"}
              </button>
              {state?.error && (
                <span className="text-sm text-red-600">{state.error}</span>
              )}
            </div>
          )}
        </>
      )}
    </form>
  );
}
