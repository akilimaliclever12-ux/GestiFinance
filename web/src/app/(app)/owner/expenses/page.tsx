import { createClient } from "@/lib/supabase/server";
import { CancelExpenseButton } from "./CancelExpenseButton";
import { PAYMENT_METHOD_LABELS, type CurrencyCode, type PaymentMethod } from "@/lib/types";

type ExpRow = {
  id: string;
  beneficiary: string | null;
  amount: number;
  currency: CurrencyCode;
  payment_method: PaymentMethod | null;
  paid_at: string;
  expense_categories: { name: string } | null;
  schools: { name: string } | null;
};

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export default async function OwnerExpensesPage() {
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expense_events")
    .select(
      "id, beneficiary, amount, currency, payment_method, paid_at, expense_categories(name), schools(name)",
    )
    .eq("event_type", "expense")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (expenses ?? []) as unknown as ExpRow[];

  const { data: cancels } = await supabase
    .from("expense_events")
    .select("cancels_event_id")
    .eq("event_type", "cancellation");
  const cancelled = new Set((cancels ?? []).map((c) => c.cancels_event_id as string));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Dépenses — supervision</h1>
        <p className="text-sm text-neutral-500">
          Toutes les sorties de vos écoles. Vous seul autorisez une annulation.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">École</th>
              <th className="px-4 py-2">Catégorie</th>
              <th className="px-4 py-2">Bénéficiaire</th>
              <th className="px-4 py-2">Mode</th>
              <th className="px-4 py-2">Montant</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rows.map((e) => {
              const isCancelled = cancelled.has(e.id);
              return (
                <tr key={e.id} className={isCancelled ? "opacity-50" : ""}>
                  <td className="px-4 py-2">{e.paid_at}</td>
                  <td className="px-4 py-2 text-xs text-neutral-500">{e.schools?.name ?? "—"}</td>
                  <td className="px-4 py-2">{e.expense_categories?.name ?? "—"}</td>
                  <td className="px-4 py-2">{e.beneficiary ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-neutral-500">
                    {e.payment_method ? PAYMENT_METHOD_LABELS[e.payment_method] : "—"}
                  </td>
                  <td className="px-4 py-2 font-medium">{money(e.amount, e.currency)}</td>
                  <td className="px-4 py-2">
                    {isCancelled ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                        Annulée
                      </span>
                    ) : (
                      <CancelExpenseButton expenseId={e.id} />
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-neutral-500">
                  Aucune dépense.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
