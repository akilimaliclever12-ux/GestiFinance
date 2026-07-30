import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "./PaymentForm";
import type { CurrencyCode } from "@/lib/types";

type PayRow = {
  id: string;
  bordereau_no: string | null;
  amount: number;
  currency: CurrencyCode;
  paid_at: string;
  created_at: string;
  students: { matricule: string; last_name: string; first_name: string } | null;
  fee_types: { name: string } | null;
};

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export default async function PaymentsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: payments } = await supabase
    .from("payment_events")
    .select(
      "id, bordereau_no, amount, currency, paid_at, created_at, students(matricule, last_name, first_name), fee_types(name)",
    )
    .eq("event_type", "payment")
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = (payments ?? []) as unknown as PayRow[];

  // Marquer les paiements annulés
  const { data: cancels } = await supabase
    .from("payment_events")
    .select("cancels_event_id")
    .eq("event_type", "cancellation");
  const cancelled = new Set(
    (cancels ?? []).map((c) => c.cancels_event_id as string),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Paiements</h1>
        <p className="text-sm text-neutral-500">
          Enregistrez un bordereau ; le solde de l&apos;élève se met à jour
          automatiquement.
        </p>
      </div>

      <PaymentForm today={today} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Derniers paiements
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Élève</th>
                <th className="px-4 py-2">Frais</th>
                <th className="px-4 py-2">Bordereau</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {rows.map((p) => {
                const isCancelled = cancelled.has(p.id);
                return (
                  <tr key={p.id} className={isCancelled ? "opacity-50" : ""}>
                    <td className="px-4 py-2">{p.paid_at}</td>
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
                      {isCancelled && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                          Annulé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/receipt/${p.id}`}
                        className="text-brand hover:underline"
                      >
                        Reçu
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-neutral-500">
                    Aucun paiement enregistré.
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
