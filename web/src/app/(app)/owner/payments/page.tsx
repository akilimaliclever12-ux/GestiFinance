import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CancelPaymentButton } from "./CancelPaymentButton";
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
        <table className="w-full min-w-[820px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">École</th>
              <th className="px-4 py-2">Élève</th>
              <th className="px-4 py-2">Frais</th>
              <th className="px-4 py-2">Bordereau</th>
              <th className="px-4 py-2">Montant</th>
              <th className="px-4 py-2">Reçu</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rows.map((p) => {
              const isCancelled = cancelled.has(p.id);
              return (
                <tr key={p.id} className={isCancelled ? "opacity-50" : ""}>
                  <td className="px-4 py-2">{p.paid_at}</td>
                  <td className="px-4 py-2 text-xs text-neutral-500">
                    {p.schools?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {p.students
                      ? `${p.students.last_name} ${p.students.first_name}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{p.fee_types?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.bordereau_no ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {money(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/receipt/${p.id}`} className="text-brand hover:underline">
                      Reçu
                    </Link>
                  </td>
                  <td className="px-4 py-2">
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
                <td colSpan={8} className="px-4 py-4 text-neutral-500">
                  Aucun paiement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
