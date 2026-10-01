import { createClient } from "@/lib/supabase/server";
import { CancelActionButton } from "./CancelActionButton";
import { tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";
import type { CurrencyCode } from "@/lib/types";
import { getI18n } from "@/i18n/server";
import { formatMoney, formatIsoDate } from "@/i18n/format";

interface Action {
  kind: "payment" | "expense";
  id: string;
  created_at: string;
  paid_at: string;
  amount: number;
  currency: CurrencyCode;
  school: string;
  label: string;
  cancelled: boolean;
  cancelReason: string | null;
  cancelAt: string | null;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { locale, t } = await getI18n();
  const th = t.owner.history;
  const money = (n: number, c: string) => formatMoney(locale, n, c);

  const [{ data: pays }, { data: exps }] = await Promise.all([
    supabase
      .from("payment_events")
      .select(
        "id, event_type, cancels_event_id, note, amount, currency, paid_at, created_at, students(last_name, first_name), fee_types(name), schools(name)",
      )
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("expense_events")
      .select(
        "id, event_type, cancels_event_id, note, amount, currency, paid_at, created_at, beneficiary, expense_categories(name), schools(name)",
      )
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  type PayE = {
    id: string;
    event_type: string;
    cancels_event_id: string | null;
    note: string | null;
    amount: number;
    currency: CurrencyCode;
    paid_at: string;
    created_at: string;
    students: { last_name: string; first_name: string } | null;
    fee_types: { name: string } | null;
    schools: { name: string } | null;
  };
  type ExpE = {
    id: string;
    event_type: string;
    cancels_event_id: string | null;
    note: string | null;
    amount: number;
    currency: CurrencyCode;
    paid_at: string;
    created_at: string;
    beneficiary: string | null;
    expense_categories: { name: string } | null;
    schools: { name: string } | null;
  };

  const payRows = (pays ?? []) as unknown as PayE[];
  const expRows = (exps ?? []) as unknown as ExpE[];

  // Map des annulations : event annulé -> { motif, date }
  const payCancel = new Map<string, { note: string | null; at: string }>();
  for (const p of payRows)
    if (p.event_type === "cancellation" && p.cancels_event_id)
      payCancel.set(p.cancels_event_id, { note: p.note, at: p.created_at });
  const expCancel = new Map<string, { note: string | null; at: string }>();
  for (const e of expRows)
    if (e.event_type === "cancellation" && e.cancels_event_id)
      expCancel.set(e.cancels_event_id, { note: e.note, at: e.created_at });

  const actions: Action[] = [];
  for (const p of payRows.filter((r) => r.event_type === "payment")) {
    const c = payCancel.get(p.id);
    actions.push({
      kind: "payment",
      id: p.id,
      created_at: p.created_at,
      paid_at: p.paid_at,
      amount: p.amount,
      currency: p.currency,
      school: p.schools?.name ?? "—",
      label: `${p.students ? `${p.students.last_name} ${p.students.first_name}` : "—"} · ${p.fee_types?.name ?? "—"}`,
      cancelled: !!c,
      cancelReason: c?.note ?? null,
      cancelAt: c?.at ?? null,
    });
  }
  for (const e of expRows.filter((r) => r.event_type === "expense")) {
    const c = expCancel.get(e.id);
    actions.push({
      kind: "expense",
      id: e.id,
      created_at: e.created_at,
      paid_at: e.paid_at,
      amount: e.amount,
      currency: e.currency,
      school: e.schools?.name ?? "—",
      label: `${e.expense_categories?.name ?? th.expense}${e.beneficiary ? ` · ${e.beneficiary}` : ""}`,
      cancelled: !!c,
      cancelReason: c?.note ?? null,
      cancelAt: c?.at ?? null,
    });
  }
  actions.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{th.title}</h1>
        <p className="text-sm text-neutral-500">{th.subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className={`${tableCls} min-w-[900px]`}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>{th.colDate}</th>
              <th className={thCls}>{th.colType}</th>
              <th className={thCls}>{th.colSchool}</th>
              <th className={thCls}>{th.colDetail}</th>
              <th className={`${thCls} text-right`}>{th.colAmount}</th>
              <th className={thCls}>{th.colStatus}</th>
              <th className={thCls}>{th.colAction}</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {actions.map((a) => (
              <tr key={`${a.kind}-${a.id}`} className={`${rowCls} ${a.cancelled ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                <td className={`${tdCls} whitespace-nowrap`}>{formatIsoDate(a.paid_at)}</td>
                <td className={tdCls}>
                  {a.kind === "payment" ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      {th.income}
                    </span>
                  ) : (
                    <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                      {th.expense}
                    </span>
                  )}
                </td>
                <td className={`${tdCls} text-xs text-neutral-500`}>{a.school}</td>
                <td className={tdCls}>
                  <span className={a.cancelled ? "line-through decoration-red-400" : ""}>{a.label}</span>
                  {a.cancelled && a.cancelReason && (
                    <span className="mt-0.5 block text-[11px] text-red-600">
                      {th.reason(a.cancelReason)}
                    </span>
                  )}
                </td>
                <td className={`${tdCls} text-right font-medium ${a.cancelled ? "text-neutral-400 line-through" : a.kind === "expense" ? "text-red-600 dark:text-red-400" : ""}`}>
                  {a.kind === "expense" ? "−" : ""}
                  {money(a.amount, a.currency)}
                </td>
                <td className={tdCls}>
                  {a.cancelled ? (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                      {th.cancelled}
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      {th.active}
                    </span>
                  )}
                </td>
                <td className={tdCls}>
                  {!a.cancelled && <CancelActionButton kind={a.kind} id={a.id} />}
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState>{th.empty}</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
