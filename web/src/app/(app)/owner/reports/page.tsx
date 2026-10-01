import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { Letterhead, type SchoolLetterhead } from "@/components/Letterhead";
import { PrintButton } from "@/components/PrintButton";
import { ExportButtons } from "./ExportButtons";
import { fetchAll } from "@/lib/fetch-all";
import type { CurrencyCode, PaymentMethod } from "@/lib/types";
import { getI18n } from "@/i18n/server";
import { formatIsoDate, formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import type { Aggregate, ExpenseDetail, Kind, Line, PaymentDetail, ReportData } from "./report-types";

const pad = (n: number) => String(n).padStart(2, "0");

function aggregate(rows: Line[]): Aggregate {
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

type PaymentRow = {
  id: string;
  amount: number;
  currency: CurrencyCode;
  paid_at: string;
  bordereau_no: string | null;
  fee_types: { name: string } | null;
  banks: { name: string } | null;
  students: { matricule: string; first_name: string; last_name: string; class_name: string | null } | null;
};
type ExpenseRow = {
  id: string;
  amount: number;
  currency: CurrencyCode;
  paid_at: string;
  beneficiary: string | null;
  payment_method: PaymentMethod | null;
  reference: string | null;
  expense_categories: { name: string } | null;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; from?: string; to?: string; type?: string; bank?: string }>;
}) {
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const d = t.reports.doc;
  const NO_BANK = d.noBank;
  const money = (n: number, c: string) => formatMoney(locale, n, c);
  const supabase = await createClient();
  const schools = await getMySchools();

  const now = new Date();
  const schoolId = sp.school || schools[0]?.id || "";
  const from = sp.from || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const to = sp.to || now.toISOString().slice(0, 10);
  // En-tête de l'école + banques (pour le filtre)
  const [{ data: school }, { data: bankRows }] = schoolId
    ? await Promise.all([
        supabase
          .from("schools")
          .select(
            "name, official_name, header_top, sub_header, motto, address, phone, email, bp, logo_url",
          )
          .eq("id", schoolId)
          .single(),
        supabase.from("banks").select("id, name").eq("school_id", schoolId).is("deleted_at", null).order("name"),
      ])
    : [{ data: null }, { data: [] }];
  const banks = (bankRows ?? []) as { id: string; name: string }[];

  // Filtre banque : "" = toutes, "none" = non renseignée, sinon id (ignoré s'il n'est pas de cette école)
  const bank = sp.bank === "none" || banks.some((b) => b.id === sp.bank) ? (sp.bank as string) : "";
  const bankLabel = !bank ? null : bank === "none" ? NO_BANK : banks.find((b) => b.id === bank)!.name;
  // Les dépenses n'ont pas de banque : avec un filtre banque, le rapport porte sur les recettes.
  const type: Kind = bank ? "recettes" : (sp.type as Kind) || "synthese";

  // Données financières (annulations exclues, filtrées sur la période)
  const [payInRange, payCancels, expInRange, expCancels] = schoolId
    ? await Promise.all([
        fetchAll<PaymentRow>((a, b) => {
          let q = supabase
            .from("payment_events")
            .select(
              "id, amount, currency, paid_at, bordereau_no, fee_types(name), banks(name), students(matricule, first_name, last_name, class_name)",
            )
            .eq("school_id", schoolId)
            .eq("event_type", "payment")
            .gte("paid_at", from)
            .lte("paid_at", to);
          if (bank === "none") q = q.is("bank_id", null);
          else if (bank) q = q.eq("bank_id", bank);
          return q.order("paid_at").order("id").range(a, b).overrideTypes<PaymentRow[], { merge: false }>();
        }),
        fetchAll<{ cancels_event_id: string }>((a, b) =>
          supabase
            .from("payment_events")
            .select("cancels_event_id")
            .eq("school_id", schoolId)
            .eq("event_type", "cancellation")
            .order("id")
            .range(a, b)
            .overrideTypes<{ cancels_event_id: string }[], { merge: false }>(),
        ),
        fetchAll<ExpenseRow>((a, b) =>
          supabase
            .from("expense_events")
            .select("id, amount, currency, paid_at, beneficiary, payment_method, reference, expense_categories(name)")
            .eq("school_id", schoolId)
            .eq("event_type", "expense")
            .gte("paid_at", from)
            .lte("paid_at", to)
            .order("paid_at")
            .order("id")
            .range(a, b)
            .overrideTypes<ExpenseRow[], { merge: false }>(),
        ),
        fetchAll<{ cancels_event_id: string }>((a, b) =>
          supabase
            .from("expense_events")
            .select("cancels_event_id")
            .eq("school_id", schoolId)
            .eq("event_type", "cancellation")
            .order("id")
            .range(a, b)
            .overrideTypes<{ cancels_event_id: string }[], { merge: false }>(),
        ),
      ])
    : [[], [], [], []];

  const payCancelled = new Set(payCancels.map((c) => c.cancels_event_id));
  const expCancelled = new Set(expCancels.map((c) => c.cancels_event_id));
  const pays = payInRange.filter((p) => !payCancelled.has(p.id));
  const exps = expInRange.filter((e) => !expCancelled.has(e.id));

  const recettes = aggregate(
    pays.map((p) => ({ label: p.fee_types?.name ?? t.common.other, currency: p.currency, amount: Number(p.amount) })),
  );
  const parBanque = aggregate(
    pays.map((p) => ({ label: p.banks?.name ?? NO_BANK, currency: p.currency, amount: Number(p.amount) })),
  );
  const depenses = aggregate(
    exps.map((e) => ({ label: e.expense_categories?.name ?? t.common.other, currency: e.currency, amount: Number(e.amount) })),
  );

  const currencies = [...new Set([...Object.keys(recettes.totals), ...Object.keys(depenses.totals)])];

  const title =
    type === "recettes" ? d.titleRecettes : type === "depenses" ? d.titleDepenses : d.titleSynthese;

  const payments: PaymentDetail[] = pays.map((p) => ({
    date: p.paid_at,
    matricule: p.students?.matricule ?? "",
    student: p.students ? `${p.students.last_name} ${p.students.first_name}` : "",
    className: p.students?.class_name ?? "",
    fee: p.fee_types?.name ?? t.common.other,
    bank: p.banks?.name ?? "",
    bordereau: p.bordereau_no ?? "",
    amount: Number(p.amount),
    currency: p.currency,
  }));
  const expenses: ExpenseDetail[] = exps.map((e) => ({
    date: e.paid_at,
    category: e.expense_categories?.name ?? t.common.other,
    beneficiary: e.beneficiary ?? "",
    method: e.payment_method ? t.common.paymentMethods[e.payment_method] : "",
    reference: e.reference ?? "",
    amount: Number(e.amount),
    currency: e.currency,
  }));
  const report: ReportData | null = school
    ? {
        locale,
        school: school as SchoolLetterhead,
        kind: type,
        title,
        from,
        to,
        bankLabel,
        recettes,
        parBanque,
        depenses,
        currencies,
        payments,
        expenses,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <form method="get" className="no-print rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-3 text-lg font-semibold">{t.reports.page.heading}</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t.common.school}</span>
            <select name="school" defaultValue={schoolId} className={selectCls}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t.reports.page.type}</span>
            <select name="type" defaultValue={type} className={selectCls}>
              <option value="synthese">{t.reports.page.typeSynthese}</option>
              <option value="recettes">{t.reports.page.typeRecettes}</option>
              <option value="depenses">{t.reports.page.typeDepenses}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t.reports.page.bank}</span>
            <select name="bank" defaultValue={bank} className={selectCls}>
              <option value="">{t.reports.page.allBanks}</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="none">{NO_BANK}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t.reports.page.from}</span>
            <input type="date" name="from" defaultValue={from} className={selectCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">{t.reports.page.to}</span>
            <input type="date" name="to" defaultValue={to} className={selectCls} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            {t.reports.page.generate}
          </button>
          <PrintButton label={t.common.print} />
          {report && <ExportButtons report={report} />}
        </div>
        {bank && sp.type && sp.type !== "recettes" && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{t.reports.page.bankFilterNote}</p>
        )}
      </form>

      {!school ? (
        <p className="text-sm text-neutral-500">{t.reports.page.noSchool}</p>
      ) : (
        <div className="rounded-xl border border-neutral-300 bg-white p-8 text-neutral-900 print:border-0 print:p-0">
          <Letterhead school={school as SchoolLetterhead} />

          <div className="mt-4 text-center">
            <h2 className="text-base font-bold">{title}</h2>
            <p className="text-xs text-neutral-600">
              {d.period(formatIsoDate(from), formatIsoDate(to))}
              {bankLabel && d.bankSuffix(bankLabel)}
            </p>
          </div>

          {(type === "synthese" || type === "recettes") && (
            <>
              <Section title={d.recettesByFee} data={recettes} sign="" locale={locale} d={d} />
              <Section title={d.recettesByBank} data={parBanque} sign="" locale={locale} d={d} />
            </>
          )}
          {(type === "synthese" || type === "depenses") && (
            <Section title={d.depensesByCategory} data={depenses} sign="−" locale={locale} d={d} />
          )}

          {type === "synthese" && (
            <div className="mt-6 rounded-lg bg-brand-light px-5 py-3">
              <p className="mb-1 text-sm font-semibold">{d.netBalance}</p>
              {currencies.length === 0 ? (
                <p className="text-sm text-neutral-500">{d.noMovement}</p>
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
              {d.signature}
            </div>
            <p>{t.common.signedBy}</p>
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
  locale,
  d,
}: {
  title: string;
  data: { lines: Line[]; totals: Record<string, number> };
  sign: string;
  locale: Locale;
  d: Messages["reports"]["doc"];
}) {
  const money = (n: number, c: string) => formatMoney(locale, n, c);
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
              <td className="py-1.5 text-neutral-500">{d.noMovement}</td>
            </tr>
          )}
        </tbody>
        {Object.keys(data.totals).length > 0 && (
          <tfoot>
            {Object.entries(data.totals).map(([c, v]) => (
              <tr key={c} className="border-t-2 border-neutral-300">
                <td className="py-1.5 text-right text-xs font-semibold">{d.total(c)}</td>
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
