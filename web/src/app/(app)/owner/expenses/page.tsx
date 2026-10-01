import { createClient } from "@/lib/supabase/server";
import { CancelExpenseButton } from "./CancelExpenseButton";
import { tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";
import type { CurrencyCode, PaymentMethod } from "@/lib/types";
import { getI18n } from "@/i18n/server";
import { formatMoney, formatIsoDate } from "@/i18n/format";

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

export default async function OwnerExpensesPage() {
  const supabase = await createClient();
  const { locale, t } = await getI18n();
  const te = t.owner.expenses;
  const money = (n: number, c: string) => formatMoney(locale, n, c);

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
        <h1 className="text-lg font-semibold">{te.title}</h1>
        <p className="text-sm text-neutral-500">{te.subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className={`${tableCls} min-w-[820px]`}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>{te.colDate}</th>
              <th className={thCls}>{te.colSchool}</th>
              <th className={thCls}>{te.colCategory}</th>
              <th className={thCls}>{te.colBeneficiary}</th>
              <th className={thCls}>{te.colMethod}</th>
              <th className={thCls}>{te.colAmount}</th>
              <th className={thCls}>{te.colAction}</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {rows.map((e) => {
              const isCancelled = cancelled.has(e.id);
              return (
                <tr key={e.id} className={`${rowCls} ${isCancelled ? "opacity-50" : ""}`}>
                  <td className={`${tdCls} whitespace-nowrap`}>{formatIsoDate(e.paid_at)}</td>
                  <td className={`${tdCls} text-xs text-neutral-500`}>{e.schools?.name ?? "—"}</td>
                  <td className={tdCls}>{e.expense_categories?.name ?? "—"}</td>
                  <td className={tdCls}>{e.beneficiary ?? "—"}</td>
                  <td className={`${tdCls} text-xs text-neutral-500`}>
                    {e.payment_method ? t.common.paymentMethods[e.payment_method] : "—"}
                  </td>
                  <td className={`${tdCls} font-medium text-red-600 dark:text-red-400`}>{money(e.amount, e.currency)}</td>
                  <td className={tdCls}>
                    {isCancelled ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                        {te.cancelled}
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
                  <EmptyState>{te.empty}</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
