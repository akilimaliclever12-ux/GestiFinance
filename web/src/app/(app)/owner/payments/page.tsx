import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CancelPaymentButton } from "./CancelPaymentButton";
import { tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";
import type { CurrencyCode } from "@/lib/types";

type PayRow = {
  id: string;
  bordereau_no: string | null;
  amount: number;
  currency: CurrencyCode;
  paid_at: string;
  students: { last_name: string; first_name: string } | null;
  fee_types: { name: string } | null;
  schools: { name: string } | null;
};

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export default async function OwnerPaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payment_events")
    .select(
      "id, bordereau_no, amount, currency, paid_at, students(last_name, first_name), fee_types(name), schools(name)",
    )
    .eq("event_type", "payment")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (payments ?? []) as unknown as PayRow[];

  const { data: cancels } = await supabase
    .from("payment_events")
    .select("cancels_event_id")
    .eq("event_type", "cancellation");
  const cancelled = new Set((cancels ?? []).map((c) => c.cancels_event_id as string));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Paiements — supervision</h1>
        <p className="text-sm text-neutral-500">
          Vue consolidée de toutes vos écoles. Vous seul pouvez autoriser une
          annulation.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className={`${tableCls} min-w-[820px]`}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Date</th>
              <th className={thCls}>École</th>
              <th className={thCls}>Élève</th>
              <th className={thCls}>Frais</th>
              <th className={thCls}>Bordereau</th>
              <th className={thCls}>Montant</th>
              <th className={thCls}>Reçu</th>
              <th className={thCls}>Action</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {rows.map((p) => {
              const isCancelled = cancelled.has(p.id);
              return (
                <tr key={p.id} className={`${rowCls} ${isCancelled ? "opacity-50" : ""}`}>
                  <td className={`${tdCls} whitespace-nowrap`}>{p.paid_at}</td>
                  <td className={`${tdCls} text-xs text-neutral-500`}>
                    {p.schools?.name ?? "—"}
                  </td>
                  <td className={tdCls}>
                    {p.students
                      ? `${p.students.last_name} ${p.students.first_name}`
                      : "—"}
                  </td>
                  <td className={tdCls}>{p.fee_types?.name ?? "—"}</td>
                  <td className={`${tdCls} font-mono text-xs`}>
                    {p.bordereau_no ?? "—"}
                  </td>
                  <td className={`${tdCls} font-medium`}>
                    {money(p.amount, p.currency)}
                  </td>
                  <td className={tdCls}>
                    <Link href={`/receipt/${p.id}`} className="font-medium text-brand hover:underline">
                      Reçu
                    </Link>
                  </td>
                  <td className={tdCls}>
                    {isCancelled ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                        Annulé
                      </span>
                    ) : (
                      <CancelPaymentButton paymentId={p.id} />
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState>Aucun paiement.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
