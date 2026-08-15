import { createClient } from "@/lib/supabase/server";
import { CancelExpenseButton } from "./CancelExpenseButton";
import { tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";
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
        <table className={`${tableCls} min-w-[820px]`}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Date</th>
              <th className={thCls}>École</th>
              <th className={thCls}>Catégorie</th>
              <th className={thCls}>Bénéficiaire</th>
              <th className={thCls}>Mode</th>
              <th className={thCls}>Montant</th>
              <th className={thCls}>Action</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {rows.map((e) => {
              const isCancelled = cancelled.has(e.id);
              return (
                <tr key={e.id} className={`${rowCls} ${isCancelled ? "opacity-50" : ""}`}>
                  <td className={`${tdCls} whitespace-nowrap`}>{e.paid_at}</td>
                  <td className={`${tdCls} text-xs text-neutral-500`}>{e.schools?.name ?? "—"}</td>
                  <td className={tdCls}>{e.expense_categories?.name ?? "—"}</td>
                  <td className={tdCls}>{e.beneficiary ?? "—"}</td>
                  <td className={`${tdCls} text-xs text-neutral-500`}>
                    {e.payment_method ? PAYMENT_METHOD_LABELS[e.payment_method] : "—"}
                  </td>
                  <td className={`${tdCls} font-medium text-red-600 dark:text-red-400`}>{money(e.amount, e.currency)}</td>
                  <td className={tdCls}>
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
                <td colSpan={7}>
                  <EmptyState>Aucune dépense.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
