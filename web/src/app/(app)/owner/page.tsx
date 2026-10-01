import { createClient } from "@/lib/supabase/server";
import { cardCls, tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { fetchAll } from "@/lib/fetch-all";
import {
  IconSchool,
  IconUsers,
  IconCheck,
  IconAlert,
  IconTrendUp,
  IconTrendDown,
} from "@/components/icons";
import type { CurrencyCode } from "@/lib/types";

type CurrencyTotals = Partial<Record<CurrencyCode, number>>;

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

type Row = { amount: number; currency: CurrencyCode; paid_at: string; school_id: string; bank_id?: string | null };

// Les écoles sont en RDC / au Burundi : les « jours » se comptent en heure de Lubumbashi (UTC+2).
const TZ = "Africa/Lubumbashi";
const localDate = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ }); // AAAA-MM-JJ
const NO_BANK = "Banque non renseignée";

export default async function OwnerDashboard() {
  const supabase = await createClient();

  const todayStr = localDate(new Date());
  const [y, m, d] = todayStr.split("-").map(Number);
  const firstOfYear = `${y}-01-01`;
  const firstOfMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  // Lundi de la semaine en cours (calcul sur la date locale, à midi UTC pour éviter tout décalage)
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  noon.setUTCDate(noon.getUTCDate() - ((noon.getUTCDay() + 6) % 7));
  const firstOfWeek = noon.toISOString().slice(0, 10);

  const [schoolsRes, banksRes, pays, exps, statuses] = await Promise.all([
    supabase.from("schools").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("banks").select("id, name"),
    fetchAll<Row>((a, b) =>
      supabase
        .from("payments_effective")
        .select("amount, currency, paid_at, school_id, bank_id")
        .gte("paid_at", firstOfYear)
        .order("id")
        .range(a, b)
        .overrideTypes<Row[], { merge: false }>(),
    ),
    fetchAll<Row>((a, b) =>
      supabase
        .from("expenses_effective")
        .select("amount, currency, paid_at, school_id")
        .gte("paid_at", firstOfYear)
        .order("id")
        .range(a, b)
        .overrideTypes<Row[], { merge: false }>(),
    ),
    fetchAll<{ school_id: string; is_in_order: boolean }>((a, b) =>
      supabase
        .from("student_solvency_status")
        .select("school_id, is_in_order")
        .order("student_id")
        .range(a, b)
        .overrideTypes<{ school_id: string; is_in_order: boolean }[], { merge: false }>(),
    ),
  ]);
  const schools = (schoolsRes.data ?? []) as { id: string; name: string }[];
  const bankName = new Map(((banksRes.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]));

  const mk = () => ({
    today: {} as CurrencyTotals,
    week: {} as CurrencyTotals,
    month: {} as CurrencyTotals,
    year: {} as CurrencyTotals,
  });
  const rec = mk();
  const dep = mk();
  const add = (t: CurrencyTotals, c: CurrencyCode, a: number) => {
    t[c] = (t[c] ?? 0) + Number(a);
  };
  const fill = (bucket: ReturnType<typeof mk>, rows: Row[]) => {
    for (const p of rows) {
      add(bucket.year, p.currency, p.amount);
      if (p.paid_at >= firstOfMonth) add(bucket.month, p.currency, p.amount);
      if (p.paid_at >= firstOfWeek) add(bucket.week, p.currency, p.amount);
      if (p.paid_at === todayStr) add(bucket.today, p.currency, p.amount);
    }
  };
  fill(rec, pays);
  fill(dep, exps);

  // Répartition par école (année en cours) + solvabilité par école
  const perSchool = new Map(
    schools.map((s) => [s.id, { rec: {} as CurrencyTotals, dep: {} as CurrencyTotals, students: 0, ko: 0 }]),
  );
  for (const p of pays) {
    const e = perSchool.get(p.school_id);
    if (e) add(e.rec, p.currency, p.amount);
  }
  for (const x of exps) {
    const e = perSchool.get(x.school_id);
    if (e) add(e.dep, x.currency, x.amount);
  }
  for (const st of statuses) {
    const e = perSchool.get(st.school_id);
    if (!e) continue;
    e.students++;
    if (!st.is_in_order) e.ko++;
  }

  // Répartition des recettes par banque (année en cours), regroupées par nom
  const perBank = new Map<string, CurrencyTotals>();
  for (const p of pays) {
    const name = (p.bank_id && bankName.get(p.bank_id)) || NO_BANK;
    const t = perBank.get(name) ?? {};
    add(t, p.currency, p.amount);
    perBank.set(name, t);
  }
  const bankCurrencies = [...new Set([...perBank.values()].flatMap((t) => Object.keys(t)))] as CurrencyCode[];
  const bankRows = bankCurrencies.map((c) => {
    const total = rec.year[c] ?? 0;
    const rows = [...perBank.entries()]
      .filter(([, t]) => t[c])
      .map(([name, t]) => ({ name, amount: t[c]!, share: total ? t[c]! / total : 0 }))
      .sort((a, b) => b.amount - a.amount);
    return { c, rows };
  });

  const totalStudents = statuses.length;
  const notInOrder = statuses.filter((s) => !s.is_in_order).length;
  const solvables = totalStudents - notInOrder;
  const iconCls = "h-5 w-5";

  const yearCurrencies = Array.from(
    new Set([...Object.keys(rec.year), ...Object.keys(dep.year)]),
  ) as CurrencyCode[];
  const yearNet = yearCurrencies
    .map((c) => ({ c, net: (rec.year[c] ?? 0) - (dep.year[c] ?? 0) }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-neutral-500">Recettes, dépenses et solde net de vos écoles.</p>
      </div>

      {/* Héros — solde net de l'année */}
      <section className="overflow-hidden rounded-2xl bg-brand text-white shadow-sm shadow-brand/20">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-medium text-white/70">Solde net · cette année</p>
            {yearNet.length === 0 ? (
              <p className="mt-1 text-3xl font-bold">—</p>
            ) : (
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {yearNet.map((n, i) => (
                  <span
                    key={n.c}
                    className={`font-display tabular-nums font-bold ${i === 0 ? "text-3xl sm:text-4xl" : "text-lg text-white/80"}`}
                  >
                    {money(n.net, n.c)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {yearCurrencies.length > 0 && (
            <div className="space-y-1.5 border-t border-white/15 pt-3 text-sm sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              {yearCurrencies.map((c) => (
                <div key={c} className="flex items-center justify-between gap-6 sm:justify-end">
                  <span className="text-white/60">{c}</span>
                  <span className="flex items-center gap-1 text-white/90">
                    <IconTrendUp className="h-3.5 w-3.5" /> {money(rec.year[c] ?? 0, c)}
                  </span>
                  <span className="flex items-center gap-1 text-white/70">
                    <IconTrendDown className="h-3.5 w-3.5" /> {money(dep.year[c] ?? 0, c)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Indicateurs élèves */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Écoles" value={String(schools.length)} icon={<IconSchool className={iconCls} />} tone="brand" />
        <Stat label="Élèves" value={String(totalStudents)} icon={<IconUsers className={iconCls} />} tone="brand" />
        <Stat label="Solvables" value={String(solvables)} icon={<IconCheck className={iconCls} />} tone="ok" />
        <Stat label="Non solvables" value={String(notInOrder)} icon={<IconAlert className={iconCls} />} tone={notInOrder ? "bad" : "muted"} />
      </section>

      {/* Trésorerie détaillée */}
      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Trésorerie</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <TresorerieCard title="Aujourd'hui" recettes={rec.today} depenses={dep.today} />
          <TresorerieCard title="Cette semaine" recettes={rec.week} depenses={dep.week} />
          <TresorerieCard title="Ce mois" recettes={rec.month} depenses={dep.month} />
          <TresorerieCard title="Cette année" recettes={rec.year} depenses={dep.year} />
        </div>
      </section>

      {/* Répartition par école */}
      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Par école · cette année
        </h2>
        <div className="overflow-x-auto">
          <table className={`${tableCls} min-w-[640px]`}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>École</th>
                <th className={`${thCls} text-right`}>Recettes</th>
                <th className={`${thCls} text-right`}>Dépenses</th>
                <th className={`${thCls} text-right`}>Solde</th>
                <th className={`${thCls} text-right`}>Élèves</th>
                <th className={`${thCls} text-right`}>Non solvables</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {schools.map((s) => {
                const e = perSchool.get(s.id)!;
                const cs = [...new Set([...Object.keys(e.rec), ...Object.keys(e.dep)])] as CurrencyCode[];
                return (
                  <tr key={s.id} className={`${rowCls} align-top`}>
                    <td className={`${tdCls} font-medium`}>
                      <span className="flex items-center gap-2">
                        <IconSchool className="h-4 w-4 shrink-0 text-neutral-400" />
                        {s.name}
                      </span>
                    </td>
                    <MoneyCell cs={cs} get={(c) => e.rec[c] ?? 0} />
                    <MoneyCell cs={cs} get={(c) => e.dep[c] ?? 0} />
                    <MoneyCell cs={cs} get={(c) => (e.rec[c] ?? 0) - (e.dep[c] ?? 0)} signed />
                    <td className={`${tdCls} text-right tabular-nums`}>{e.students}</td>
                    <td className={`${tdCls} text-right font-semibold tabular-nums ${e.ko ? "text-red-600" : "text-neutral-400"}`}>
                      {e.ko}
                    </td>
                  </tr>
                );
              })}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${tdCls} text-neutral-500`}>
                    Aucune école.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Répartition par banque */}
      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Recettes par banque · cette année
        </h2>
        {bankRows.length === 0 ? (
          <div className={cardCls}>
            <p className="text-sm text-neutral-500">Aucune recette cette année.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {bankRows.map(({ c, rows }) => (
              <div key={c} className={cardCls}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {c} · {money(rec.year[c] ?? 0, c)}
                </p>
                <ul className="space-y-2.5">
                  {rows.map((r) => (
                    <li key={r.name}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className={r.name === NO_BANK ? "italic text-neutral-500" : "font-medium"}>{r.name}</span>
                        <span className="tabular-nums">
                          {money(r.amount, c)}
                          <span className="ml-2 text-xs text-neutral-400">{Math.round(r.share * 100)} %</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(r.share * 100, 1)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const TONES: Record<string, { border: string; value: string; icon: string }> = {
  brand: { border: "border-brand", value: "text-brand-dark dark:text-brand", icon: "text-brand" },
  ok: { border: "border-emerald-500", value: "text-brand-dark dark:text-brand", icon: "text-emerald-600" },
  bad: { border: "border-accent-red", value: "text-accent-red", icon: "text-accent-red" },
  muted: { border: "border-neutral-300 dark:border-neutral-700", value: "text-brand-dark dark:text-neutral-200", icon: "text-neutral-400" },
};

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className={`rounded-xl border-l-4 ${t.border} bg-white p-4 shadow-sm dark:bg-neutral-900`}>
      <div className="flex items-start justify-between">
        <p className={`font-display text-3xl font-extrabold tabular-nums ${t.value}`}>{value}</p>
        <span className={`${t.icon} opacity-70`}>{icon}</span>
      </div>
      <p className="mt-0.5 text-sm text-neutral-500">{label}</p>
    </div>
  );
}

function TresorerieCard({
  title,
  recettes,
  depenses,
}: {
  title: string;
  recettes: CurrencyTotals;
  depenses: CurrencyTotals;
}) {
  const currencies = Array.from(
    new Set([...Object.keys(recettes), ...Object.keys(depenses)]),
  ) as CurrencyCode[];

  return (
    <div className={cardCls}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      {currencies.length === 0 ? (
        <p className="py-2 text-2xl font-bold text-neutral-300 dark:text-neutral-600">—</p>
      ) : (
        <div className="space-y-2.5">
          {currencies.map((c) => {
            const r = recettes[c] ?? 0;
            const d = depenses[c] ?? 0;
            const net = r - d;
            return (
              <div key={c} className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <IconTrendUp className="h-3.5 w-3.5" /> Recettes
                  </span>
                  <span className="font-medium tabular-nums">{money(r, c)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-red-600">
                    <IconTrendDown className="h-3.5 w-3.5" /> Dépenses
                  </span>
                  <span className="font-medium tabular-nums">{money(d, c)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between border-t border-neutral-200 pt-1.5 dark:border-neutral-700">
                  <span className="text-xs font-semibold">Solde · {c}</span>
                  <span className={`font-display text-base font-bold tabular-nums ${net >= 0 ? "text-brand" : "text-red-600"}`}>
                    {money(net, c)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MoneyCell({
  cs,
  get,
  signed,
}: {
  cs: CurrencyCode[];
  get: (c: CurrencyCode) => number;
  signed?: boolean;
}) {
  return (
    <td className={`${tdCls} text-right tabular-nums`}>
      {cs.length === 0 ? (
        <span className="text-neutral-300 dark:text-neutral-600">—</span>
      ) : (
        cs.map((c) => {
          const v = get(c);
          return (
            <div key={c} className={`whitespace-nowrap ${signed ? (v >= 0 ? "font-semibold text-brand" : "font-semibold text-red-600") : ""}`}>
              {money(v, c)}
            </div>
          );
        })
      )}
    </td>
  );
}
