import { createClient } from "@/lib/supabase/server";
import { cardCls } from "@/lib/ui";
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

export default async function OwnerDashboard() {
  const supabase = await createClient();

  const now = new Date();
  const y = now.getFullYear();
  const firstOfYear = `${y}-01-01`;
  const firstOfMonth = `${y}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().slice(0, 10);

  const [
    { data: schools },
    { data: pays },
    { data: exps },
    { count: totalStudents },
    { count: notInOrder },
  ] = await Promise.all([
    supabase.from("schools").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("payments_effective").select("amount, currency, paid_at").gte("paid_at", firstOfYear),
    supabase.from("expenses_effective").select("amount, currency, paid_at").gte("paid_at", firstOfYear),
    supabase.from("student_solvency_status").select("student_id", { count: "exact", head: true }),
    supabase.from("student_solvency_status").select("student_id", { count: "exact", head: true }).eq("is_in_order", false),
  ]);

  const mk = () => ({ today: {} as CurrencyTotals, month: {} as CurrencyTotals, year: {} as CurrencyTotals });
  const rec = mk();
  const dep = mk();
  const add = (m: CurrencyTotals, c: CurrencyCode, a: number) => {
    m[c] = (m[c] ?? 0) + Number(a);
  };
  const fill = (bucket: ReturnType<typeof mk>, rows: { amount: number; currency: string; paid_at: string }[] | null) => {
    for (const p of rows ?? []) {
      const c = p.currency as CurrencyCode;
      add(bucket.year, c, p.amount);
      if (p.paid_at >= firstOfMonth) add(bucket.month, c, p.amount);
      if (p.paid_at === todayStr) add(bucket.today, c, p.amount);
    }
  };
  fill(rec, pays);
  fill(dep, exps);

  const solvables = (totalStudents ?? 0) - (notInOrder ?? 0);
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
        <Stat label="Écoles" value={String(schools?.length ?? 0)} icon={<IconSchool className={iconCls} />} tone="brand" />
        <Stat label="Élèves" value={String(totalStudents ?? 0)} icon={<IconUsers className={iconCls} />} tone="brand" />
        <Stat label="Solvables" value={String(solvables)} icon={<IconCheck className={iconCls} />} tone="ok" />
        <Stat label="Non solvables" value={String(notInOrder ?? 0)} icon={<IconAlert className={iconCls} />} tone={notInOrder ? "bad" : "muted"} />
      </section>

      {/* Trésorerie détaillée */}
      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Trésorerie</h2>
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <TresorerieCard title="Aujourd'hui" recettes={rec.today} depenses={dep.today} />
          <TresorerieCard title="Ce mois" recettes={rec.month} depenses={dep.month} />
          <TresorerieCard title="Cette année" recettes={rec.year} depenses={dep.year} />
        </div>
      </section>

      {/* Écoles */}
      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Mes écoles</h2>
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {(schools ?? []).map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-4 py-3 text-sm">
              <IconSchool className="h-4 w-4 text-neutral-400" />
              {s.name}
            </li>
          ))}
          {(!schools || schools.length === 0) && (
            <li className="px-4 py-3 text-sm text-neutral-500">Aucune école.</li>
          )}
        </ul>
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
