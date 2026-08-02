import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { Letterhead, type SchoolLetterhead } from "@/components/Letterhead";
import { PrintButton } from "./PrintButton";
import type { CurrencyCode } from "@/lib/types";

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;
const pad = (n: number) => String(n).padStart(2, "0");

type Kind = "synthese" | "recettes" | "depenses";
type Line = { label: string; currency: CurrencyCode; amount: number };

function aggregate(
  rows: { label: string; currency: CurrencyCode; amount: number }[],
): { lines: Line[]; totals: Record<string, number> } {
  const byKey = new Map<string, Line>();
  const totals: Record<string, number> = {};
  for (const r of rows) {
    const key = `${r.label}||${r.currency}`;
    const ex = byKey.get(key);
    if (ex) ex.amount += r.amount;
    else byKey.set(key, { ...r });
    totals[r.currency] = (totals[r.currency] ?? 0) + r.amount;
  }
  return {
    lines: [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label)),
    totals,
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; from?: string; to?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const schools = await getMySchools();

  const now = new Date();
  const schoolId = sp.school || schools[0]?.id || "";
  const from = sp.from || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const to = sp.to || now.toISOString().slice(0, 10);
  const type = (sp.type as Kind) || "synthese";

  // En-tête de l'école
  const { data: school } = schoolId
    ? await supabase
        .from("schools")
        .select(
          "name, official_name, header_top, sub_header, motto, address, phone, email, bp, logo_url",
        )
        .eq("id", schoolId)
        .single()
    : { data: null };

  // Données financières (annulations exclues, filtrées sur la période)
  const [payInRange, payCancels, expInRange, expCancels] = schoolId
    ? await Promise.all([
        supabase
          .from("payment_events")
          .select("id, amount, currency, fee_types(name)")
          .eq("school_id", schoolId)
          .eq("event_type", "payment")
          .gte("paid_at", from)
          .lte("paid_at", to),
        supabase
          .from("payment_events")
          .select("cancels_event_id")
          .eq("school_id", schoolId)
          .eq("event_type", "cancellation"),
        supabase
          .from("expense_events")
          .select("id, amount, currency, expense_categories(name)")
          .eq("school_id", schoolId)
          .eq("event_type", "expense")
          .gte("paid_at", from)
          .lte("paid_at", to),
        supabase
          .from("expense_events")
          .select("cancels_event_id")
          .eq("school_id", schoolId)
          .eq("event_type", "cancellation"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const payCancelled = new Set((payCancels.data ?? []).map((c) => c.cancels_event_id as string));
  const expCancelled = new Set((expCancels.data ?? []).map((c) => c.cancels_event_id as string));

  const recettes = aggregate(
    ((payInRange.data ?? []) as unknown as {
      id: string;
      amount: number;
      currency: CurrencyCode;
      fee_types: { name: string } | null;
    }[])
      .filter((p) => !payCancelled.has(p.id))
      .map((p) => ({ label: p.fee_types?.name ?? "Autre", currency: p.currency, amount: Number(p.amount) })),
  );
  const depenses = aggregate(
    ((expInRange.data ?? []) as unknown as {
      id: string;
      amount: number;
      currency: CurrencyCode;
      expense_categories: { name: string } | null;
    }[])
      .filter((e) => !expCancelled.has(e.id))
      .map((e) => ({ label: e.expense_categories?.name ?? "Autre", currency: e.currency, amount: Number(e.amount) })),
  );

  const currencies = [...new Set([...Object.keys(recettes.totals), ...Object.keys(depenses.totals)])];

  const title =
    type === "recettes" ? "RAPPORT DES RECETTES" : type === "depenses" ? "RAPPORT DES DÉPENSES" : "RAPPORT FINANCIER";

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <form method="get" className="no-print rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-3 text-lg font-semibold">Rapports</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">École</span>
            <select name="school" defaultValue={schoolId} className={selectCls}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Type</span>
            <select name="type" defaultValue={type} className={selectCls}>
              <option value="synthese">Synthèse (recettes + dépenses + solde)</option>
              <option value="recettes">Recettes</option>
              <option value="depenses">Dépenses</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Du</span>
            <input type="date" name="from" defaultValue={from} className={selectCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Au</span>
            <input type="date" name="to" defaultValue={to} className={selectCls} />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Générer
          </button>
          <PrintButton />
        </div>
      </form>

      {!school ? (
        <p className="text-sm text-neutral-500">
          Aucune école. Créez-en une (onglet Écoles) pour générer un rapport.
        </p>
      ) : (
        <div className="rounded-xl border border-neutral-300 bg-white p-8 text-neutral-900 print:border-0 print:p-0">
          <Letterhead school={school as SchoolLetterhead} />

          <div className="mt-4 text-center">
            <h2 className="text-base font-bold">{title}</h2>
            <p className="text-xs text-neutral-600">
              Période du {from} au {to}
            </p>
          </div>

          {(type === "synthese" || type === "recettes") && (
            <Section title="Recettes (par type de frais)" data={recettes} sign="" />
          )}
          {(type === "synthese" || type === "depenses") && (
            <Section title="Dépenses (par catégorie)" data={depenses} sign="−" />
          )}

          {type === "synthese" && (
            <div className="mt-6 rounded-lg bg-brand-light px-5 py-3">
              <p className="mb-1 text-sm font-semibold">Solde net par devise</p>
              {currencies.length === 0 ? (
                <p className="text-sm text-neutral-500">Aucun mouvement sur la période.</p>
              ) : (
                <ul className="space-y-0.5">
                  {currencies.map((c) => {
                    const net = (recettes.totals[c] ?? 0) - (depenses.totals[c] ?? 0);
                    return (
                      <li key={c} className="flex justify-between text-sm">
                        <span>{c}</span>
                        <span className={`font-bold ${net >= 0 ? "text-brand" : "text-red-600"}`}>
                          {money(net, c)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <footer className="mt-10 flex items-end justify-between text-xs text-neutral-500">
            <div>
              <div className="mb-1 h-10 w-44 border-b border-neutral-300" />
              Le Promoteur
            </div>
            <p>Édité via GestiFinance</p>
          </footer>
        </div>
      )}
    </div>
  );
}

const selectCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

function Section({
  title,
  data,
  sign,
}: {
  title: string;
  data: { lines: Line[]; totals: Record<string, number> };
  sign: string;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {data.lines.map((l, i) => (
            <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-1.5">{l.label}</td>
              <td className="py-1.5 text-right font-medium">
                {sign}
                {money(l.amount, l.currency)}
              </td>
            </tr>
          ))}
          {data.lines.length === 0 && (
            <tr>
              <td className="py-1.5 text-neutral-500">Aucun mouvement sur la période.</td>
            </tr>
          )}
        </tbody>
        {Object.keys(data.totals).length > 0 && (
          <tfoot>
            {Object.entries(data.totals).map(([c, v]) => (
              <tr key={c} className="border-t-2 border-neutral-300">
                <td className="py-1.5 text-right text-xs font-semibold">Total {c}</td>
                <td className="py-1.5 text-right font-bold">
                  {sign}
                  {money(v, c)}
                </td>
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
}
