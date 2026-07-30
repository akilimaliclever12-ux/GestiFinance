import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { getSessionProfile } from "@/lib/auth";
import { ExpenseForm, type CategoryRef } from "./ExpenseForm";
import { ExpenseCategoryForm } from "./ExpenseCategoryForm";
import {
  PAYMENT_METHOD_LABELS,
  type CurrencyCode,
  type PaymentMethod,
} from "@/lib/types";

type ExpRow = {
  id: string;
  beneficiary: string | null;
  amount: number;
  currency: CurrencyCode;
  payment_method: PaymentMethod | null;
  reference: string | null;
  paid_at: string;
  expense_categories: { name: string } | null;
};

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export default async function ExpensesPage() {
  const supabase = await createClient();
  const session = await getSessionProfile();
  const today = new Date().toISOString().slice(0, 10);

  const schools = await getMySchools();

  const [{ data: cats }, { data: tenant }, { data: expenses }, { data: cancels }] =
    await Promise.all([
      supabase
        .from("expense_categories")
        .select("id, name, school_id")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("tenants")
        .select("default_currency")
        .eq("id", session?.profile?.tenant_id ?? "")
        .single(),
      supabase
        .from("expense_events")
        .select(
          "id, beneficiary, amount, currency, payment_method, reference, paid_at, expense_categories(name)",
        )
        .eq("event_type", "expense")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("expense_events")
        .select("cancels_event_id")
        .eq("event_type", "cancellation"),
    ]);

  const categories = (cats ?? []) as CategoryRef[];
  const defaultCurrency = (tenant?.default_currency ?? "CDF") as CurrencyCode;
  const rows = (expenses ?? []) as unknown as ExpRow[];
  const cancelled = new Set((cancels ?? []).map((c) => c.cancels_event_id as string));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dépenses (livre de caisse)</h1>
        <p className="text-sm text-neutral-500">
          Enregistrez les sorties : salaires, loyer, fournitures…
        </p>
      </div>

      <ExpenseForm
        schools={schools}
        categories={categories}
        defaultCurrency={defaultCurrency}
        today={today}
      />

      <ExpenseCategoryForm schools={schools} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Dernières dépenses
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Catégorie</th>
                <th className="px-4 py-2">Bénéficiaire</th>
                <th className="px-4 py-2">Mode</th>
                <th className="px-4 py-2">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {rows.map((e) => {
                const isCancelled = cancelled.has(e.id);
                return (
                  <tr key={e.id} className={isCancelled ? "opacity-50" : ""}>
                    <td className="px-4 py-2">{e.paid_at}</td>
                    <td className="px-4 py-2">{e.expense_categories?.name ?? "—"}</td>
                    <td className="px-4 py-2">{e.beneficiary ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-neutral-500">
                      {e.payment_method ? PAYMENT_METHOD_LABELS[e.payment_method] : "—"}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {money(e.amount, e.currency)}
                      {isCancelled && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                          Annulée
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-neutral-500">
                    Aucune dépense enregistrée.
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
