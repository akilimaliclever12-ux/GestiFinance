"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useOffline } from "@/lib/offline/OfflineProvider";
import { getStudentFile, type FeeFile } from "@/lib/offline/repo";
import { cardCls, tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";
import { PrintButton } from "@/components/PrintButton";

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;
const frDate = (iso: string) => iso.split("-").reverse().join("/");

export default function StudentFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { perms } = useOffline();
  // undefined = chargement ; null = introuvable
  const file = useLiveQuery(() => getStudentFile(id), [id]);

  if (file === undefined) {
    return <p className="text-sm text-neutral-500">Chargement…</p>;
  }
  if (file === null) {
    return (
      <div className={cardCls}>
        <p className="text-sm text-neutral-500">Élève introuvable sur cet appareil.</p>
        <Link href="/accountant/students" className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Retour aux élèves
        </Link>
      </div>
    );
  }

  const { student: s, fees, payments } = file;
  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <div className="space-y-5">
      <Link href="/accountant/students" className="no-print text-sm text-brand hover:underline">
        ← Élèves
      </Link>

      {/* Identité + statut */}
      <div className={`${cardCls} flex flex-wrap items-start justify-between gap-4 print:border-0 print:p-0 print:shadow-none`}>
        <div>
          <p className="hidden text-xs text-neutral-500 print:block">
            {file.school} — Fiche élève au {today}
          </p>
          <h1 className="text-xl font-semibold">
            {s.last_name} {s.first_name}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            <span className="font-mono">{s.matricule}</span>
            {" · "}
            {s.class_name ?? "Sans classe"}
            {s.section && ` · ${s.section}`}
            {file.school && <span className="print:hidden"> · {file.school}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {file.is_in_order ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              ● En ordre
            </span>
          ) : (
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-400">
              ● Non en ordre
            </span>
          )}
          <div className="no-print flex flex-wrap justify-end gap-2">
            {perms.canPayments && (
              <Link
                href={`/accountant/payments?student=${s.id}`}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Nouveau paiement
              </Link>
            )}
            <PrintButton label="Imprimer la fiche" />
          </div>
        </div>
      </div>

      {/* Frais */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Frais scolaires</h2>
        {fees.length === 0 ? (
          <div className={cardCls}>
            <EmptyState>Aucun frais n&apos;est paramétré pour la classe de cet élève.</EmptyState>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {fees.map((f) => (
              <FeeCard key={f.fee_type_id} fee={f} />
            ))}
          </div>
        )}
      </div>

      {/* Historique des paiements */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Historique des paiements ({payments.length})</h2>
        <div className="overflow-x-auto">
          <table className={`${tableCls} min-w-[640px]`}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Frais</th>
                <th className={thCls}>Banque</th>
                <th className={thCls}>Bordereau</th>
                <th className={`${thCls} text-right`}>Montant</th>
                <th className={`${thCls} no-print`}>Reçu</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {payments.map((p) => (
                <tr key={p.id} className={`${rowCls} ${p.cancelled ? "opacity-50" : ""}`}>
                  <td className={`${tdCls} whitespace-nowrap`}>{frDate(p.paid_at)}</td>
                  <td className={tdCls}>{p.fee}</td>
                  <td className={tdCls}>{p.bank ?? "—"}</td>
                  <td className={`${tdCls} font-mono text-xs`}>{p.bordereau_no ?? "—"}</td>
                  <td className={`${tdCls} whitespace-nowrap text-right font-medium`}>
                    <span className={p.cancelled ? "line-through" : ""}>{money(p.amount, p.currency)}</span>
                    {p.cancelled && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                        Annulé
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} no-print`}>
                    {p.synced ? (
                      <Link href={`/receipt/${p.id}`} className="font-medium text-brand hover:underline">
                        Reçu
                      </Link>
                    ) : (
                      <span className="text-xs text-amber-600" title="Le reçu sera disponible après synchronisation">
                        En attente de synchro
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>Aucun paiement enregistré pour cet élève.</EmptyState>
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

function FeeCard({ fee: f }: { fee: FeeFile }) {
  const c = f.currency;
  const dueLeft = Math.max(f.due_expected - f.total_paid, 0);
  const pct = f.total_expected > 0 ? Math.min(100, Math.round((f.total_paid / f.total_expected) * 100)) : 100;

  return (
    <div className={`${cardCls} break-inside-avoid`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{f.name}</p>
        {f.is_in_order ? (
          <span className="text-xs font-medium text-emerald-600">● En ordre</span>
        ) : (
          <span className="text-xs font-medium text-red-600">● {money(dueLeft, c)} échu impayé</span>
        )}
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-neutral-500">Attendu (année)</dt>
          <dd className="font-medium">{money(f.total_expected, c)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Payé</dt>
          <dd className="font-medium text-emerald-600">{money(f.total_paid, c)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Reste</dt>
          <dd className={`font-semibold ${f.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {money(Math.max(f.balance, 0), c)}
          </dd>
        </div>
      </dl>

      {f.tranches.length > 1 && (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2 text-xs dark:border-neutral-800">
          {f.tranches.map((t, i) => {
            const done = t.covered >= t.amount;
            return (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-neutral-500">
                  Tranche {i + 1}
                  {t.due_date ? ` · échéance ${frDate(t.due_date)}` : " · exigible"}
                </span>
                <span
                  className={
                    done
                      ? "text-emerald-600"
                      : t.is_due
                        ? "font-medium text-red-600"
                        : "text-neutral-500"
                  }
                >
                  {done
                    ? `✓ ${money(t.amount, c)}`
                    : `${money(t.covered, c)} / ${money(t.amount, c)}${t.is_due ? "" : " (à venir)"}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {f.next_due && (
        <p className="mt-2 text-xs text-neutral-500">Prochaine échéance : {frDate(f.next_due)}</p>
      )}
    </div>
  );
}
