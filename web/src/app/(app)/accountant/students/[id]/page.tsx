"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useOffline } from "@/lib/offline/OfflineProvider";
import { getStudentFile } from "@/lib/offline/repo";
import { FeeCard } from "@/components/FeeCard";
import { ParentAccessCard } from "./ParentAccessCard";
import { cardCls, tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";
import { PrintButton } from "@/components/PrintButton";
import { useI18n } from "@/i18n/client";
import { formatMoney, formatIsoDate as frDate, formatToday } from "@/i18n/format";

export default function StudentFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { perms } = useOffline();
  const { locale, t } = useI18n();
  const tf = t.accountant.file;
  // undefined = chargement ; null = introuvable
  const file = useLiveQuery(() => getStudentFile(id), [id]);

  if (file === undefined) {
    return <p className="text-sm text-neutral-500">{t.common.loading}</p>;
  }
  if (file === null) {
    return (
      <div className={cardCls}>
        <p className="text-sm text-neutral-500">{tf.notFound}</p>
        <Link href="/accountant/students" className="mt-2 inline-block text-sm text-brand hover:underline">
          {tf.backToStudents}
        </Link>
      </div>
    );
  }

  const { student: s, fees, payments } = file;
  const today = formatToday();

  return (
    <div className="space-y-5">
      <Link href="/accountant/students" className="no-print text-sm text-brand hover:underline">
        {tf.back}
      </Link>

      {/* Identité + statut */}
      <div className={`${cardCls} flex flex-wrap items-start justify-between gap-4 print:border-0 print:p-0 print:shadow-none`}>
        <div>
          <p className="hidden text-xs text-neutral-500 print:block">
            {tf.printHeader(file.school, today)}
          </p>
          <h1 className="text-xl font-semibold">
            {s.last_name} {s.first_name}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            <span className="font-mono">{s.matricule}</span>
            {" · "}
            {s.class_name ?? tf.noClass}
            {s.section && ` · ${s.section}`}
            {file.school && <span className="print:hidden"> · {file.school}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {file.is_in_order ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {tf.inOrder}
            </span>
          ) : (
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-400">
              {tf.notInOrder}
            </span>
          )}
          <div className="no-print flex flex-wrap justify-end gap-2">
            {perms.canPayments && (
              <Link
                href={`/accountant/payments?student=${s.id}`}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                {tf.newPayment}
              </Link>
            )}
            <PrintButton label={tf.printFile} />
          </div>
        </div>
      </div>

      {/* Frais */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">{tf.feesTitle}</h2>
        {fees.length === 0 ? (
          <div className={cardCls}>
            <EmptyState>{tf.noFees}</EmptyState>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {fees.map((f) => (
              <FeeCard key={f.fee_type_id} fee={f} />
            ))}
          </div>
        )}
      </div>

      {/* Accès parent (code à remettre au parent) */}
      <ParentAccessCard
        studentId={s.id}
        studentName={`${s.last_name} ${s.first_name}`}
        schoolName={file.school}
      />

      {/* Historique des paiements */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">{tf.historyTitle(payments.length)}</h2>
        <div className="overflow-x-auto">
          <table className={`${tableCls} min-w-[640px]`}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>{tf.colDate}</th>
                <th className={thCls}>{tf.colFee}</th>
                <th className={thCls}>{tf.colBank}</th>
                <th className={thCls}>{tf.colBordereau}</th>
                <th className={`${thCls} text-right`}>{tf.colAmount}</th>
                <th className={`${thCls} no-print`}>{tf.colReceipt}</th>
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
                    <span className={p.cancelled ? "line-through" : ""}>{formatMoney(locale, p.amount, p.currency)}</span>
                    {p.cancelled && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                        {tf.cancelled}
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} no-print`}>
                    {p.synced ? (
                      <Link href={`/receipt/${p.id}`} className="font-medium text-brand hover:underline">
                        {tf.receipt}
                      </Link>
                    ) : (
                      <span className="text-xs text-amber-600" title={tf.pendingSyncTitle}>
                        {tf.pendingSync}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>{tf.noPayments}</EmptyState>
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
