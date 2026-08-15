"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useOffline } from "@/lib/offline/OfflineProvider";
import {
  listStudents,
  getStudentFeeContext,
  createPaymentLocal,
  listRecentPayments,
  type StudentFeeContext,
} from "@/lib/offline/repo";
import { db, type StudentRow } from "@/lib/offline/db";
import { cardCls, tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";
const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export default function PaymentsPage() {
  const { ctx, flush, perms } = useOffline();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  // Résolution des noms pour l'historique
  const students = useLiveQuery(() => listStudents(), [], []);
  const feeTypes = useLiveQuery(() => db.fee_types.toArray(), [], []);
  const recent = useLiveQuery(() => listRecentPayments(), [], []);
  const studentName = new Map(students.map((s) => [s.id, `${s.last_name} ${s.first_name}`]));
  const feeName = new Map(feeTypes.map((f) => [f.id, f.name]));

  // Formulaire
  const [query, setQuery] = useState("");
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [context, setContext] = useState<StudentFeeContext | null>(null);
  const [feeTypeId, setFeeTypeId] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const hits = useLiveQuery(
    () => (query.trim() && !student ? listStudents(query) : Promise.resolve([])),
    [query, student],
    [],
  );
  const selectedFee = context?.fees.find((f) => f.fee_type_id === feeTypeId);

  async function pick(s: StudentRow) {
    setStudent(s);
    setQuery(`${s.matricule} — ${s.last_name} ${s.first_name}`);
    const c = await getStudentFeeContext(s.id);
    setContext(c);
    setFeeTypeId(c?.fees[0]?.fee_type_id ?? "");
  }

  function resetForm() {
    setStudent(null);
    setContext(null);
    setQuery("");
    setFeeTypeId("");
    setSavedId(null);
    setErr(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!student) return;
    const f = new FormData(e.currentTarget);
    const res = await createPaymentLocal(ctx, {
      student_id: student.id,
      fee_type_id: feeTypeId,
      bank_id: String(f.get("bank_id") || "") || null,
      bordereau_no: String(f.get("bordereau_no") || "").trim() || null,
      amount: Number(f.get("amount") || 0),
      paid_at: String(f.get("paid_at") || today),
      note: String(f.get("note") || "").trim() || null,
    });
    if (res.error) setErr(res.error);
    else {
      setSavedId(res.id ?? null);
      void flush();
    }
  }

  if (!perms.canPayments) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        Vous n&apos;êtes pas autorisé à enregistrer les paiements. Contactez le
        promoteur.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Paiements</h1>
        <p className="text-sm text-neutral-500">
          Enregistrez un bordereau. Fonctionne hors-ligne ; le solde est calculé
          localement et tout se synchronise au retour du réseau.
        </p>
      </div>

      {savedId ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Paiement enregistré.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={`/receipt/${savedId}`}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Voir / imprimer le reçu
            </Link>
            <button
              onClick={resetForm}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Enregistrer un autre paiement
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Le reçu est disponible en ligne (après synchronisation si vous êtes
            hors-ligne).
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className={cardCls}>
          <h2 className="mb-3 text-sm font-semibold">Enregistrer un paiement</h2>

          <div className="relative mb-3">
            <label className="mb-1 block text-xs text-neutral-500">Élève *</label>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setStudent(null);
                setContext(null);
              }}
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

          {context && context.fees.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              Aucun frais défini pour cette école (onglet Frais).
            </p>
          )}

          {context && context.fees.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Type de frais *</label>
                <select
                  value={feeTypeId}
                  onChange={(e) => setFeeTypeId(e.target.value)}
                  className={inputCls}
                >
                  {context.fees.map((f) => (
                    <option key={f.fee_type_id} value={f.fee_type_id}>
                      {f.name} ({f.currency})
                    </option>
                  ))}
                </select>
                {selectedFee && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Attendu : {money(selectedFee.total_expected, selectedFee.currency)} · Payé :{" "}
                    {money(selectedFee.total_paid, selectedFee.currency)} ·{" "}
                    <span className={selectedFee.balance > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                      Reste : {money(selectedFee.balance, selectedFee.currency)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Banque</label>
                <select name="bank_id" className={inputCls} defaultValue="">
                  <option value="">—</option>
                  {context.banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">N° bordereau</label>
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
                  defaultValue={selectedFee && selectedFee.balance > 0 ? selectedFee.balance : ""}
                  key={feeTypeId}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Date *</label>
                <input name="paid_at" type="date" className={inputCls} defaultValue={today} required />
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Note</label>
                <input name="note" className={inputCls} placeholder="Optionnel" />
              </div>
            </div>
          )}

          {context && context.fees.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Enregistrer le paiement
              </button>
              {err && <span className="text-sm text-red-600">{err}</span>}
            </div>
          )}
        </form>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Derniers paiements
        </h2>
        <div className="overflow-x-auto">
          <table className={`${tableCls} min-w-[720px]`}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Élève</th>
                <th className={thCls}>Frais</th>
                <th className={thCls}>Bordereau</th>
                <th className={thCls}>Montant</th>
                <th className={thCls}>Reçu</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {(recent ?? []).map((p) => (
                <tr key={p.id} className={`${rowCls} ${p.cancelled ? "opacity-50" : ""}`}>
                  <td className={`${tdCls} whitespace-nowrap`}>{p.paid_at}</td>
                  <td className={tdCls}>{studentName.get(p.student_id) ?? "—"}</td>
                  <td className={tdCls}>{feeName.get(p.fee_type_id) ?? "—"}</td>
                  <td className={`${tdCls} font-mono text-xs`}>{p.bordereau_no ?? "—"}</td>
                  <td className={`${tdCls} font-medium`}>
                    {money(p.amount, p.currency)}
                    {p.cancelled && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                        Annulé
                      </span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <Link href={`/receipt/${p.id}`} className="font-medium text-brand hover:underline">
                      Reçu
                    </Link>
                  </td>
                </tr>
              ))}
              {(!recent || recent.length === 0) && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>Aucun paiement enregistré.</EmptyState>
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
