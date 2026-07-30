import { createClient } from "@/lib/supabase/server";
import { CancelActionButton } from "./CancelActionButton";
import type { CurrencyCode } from "@/lib/types";

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

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
      label: `${e.expense_categories?.name ?? "Dépense"}${e.beneficiary ? ` · ${e.beneficiary}` : ""}`,
      cancelled: !!c,
      cancelReason: c?.note ?? null,
      cancelAt: c?.at ?? null,
    });
  }
  actions.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Historique des actions</h1>
        <p className="text-sm text-neutral-500">
          Toutes les entrées et sorties. Une annulation ne supprime rien : l&apos;action
          reste visible avec son motif, mais n&apos;est plus comptée dans les totaux.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">École</th>
              <th className="px-4 py-2">Détail</th>
              <th className="px-4 py-2 text-right">Montant</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {actions.map((a) => (
              <tr key={`${a.kind}-${a.id}`} className={a.cancelled ? "bg-red-50/40 dark:bg-red-950/10" : ""}>
                <td className="px-4 py-2 whitespace-nowrap">{a.paid_at}</td>
                <td className="px-4 py-2">
                  {a.kind === "payment" ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      Recette
                    </span>
                  ) : (
                    <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                      Dépense
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-neutral-500">{a.school}</td>
                <td className="px-4 py-2">
                  <span className={a.cancelled ? "line-through decoration-red-400" : ""}>{a.label}</span>
                  {a.cancelled && a.cancelReason && (
                    <span className="mt-0.5 block text-[11px] text-red-600">
                      Motif : {a.cancelReason}
                    </span>
                  )}
                </td>
                <td className={`px-4 py-2 text-right font-medium ${a.cancelled ? "text-neutral-400 line-through" : a.kind === "expense" ? "text-orange-700 dark:text-orange-400" : ""}`}>
                  {a.kind === "expense" ? "−" : ""}
                  {money(a.amount, a.currency)}
                </td>
                <td className="px-4 py-2">
                  {a.cancelled ? (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                      Annulé
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      Actif
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {!a.cancelled && <CancelActionButton kind={a.kind} id={a.id} />}
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-neutral-500">
                  Aucune action pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
