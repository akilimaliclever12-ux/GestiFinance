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

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-neutral-500">Recettes, dépenses et solde net de vos écoles.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Écoles" value={String(schools?.length ?? 0)} icon={<IconSchool className={iconCls} />} tone="brand" />
        <Stat label="Élèves" value={String(totalStudents ?? 0)} icon={<IconUsers className={iconCls} />} tone="brand" />
        <Stat label="Solvables" value={String(solvables)} icon={<IconCheck className={iconCls} />} tone="ok" />
        <Stat label="Non solvables" value={String(notInOrder ?? 0)} icon={<IconAlert className={iconCls} />} tone={notInOrder ? "bad" : "muted"} />
      </section>

      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Trésorerie</h2>
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          <TresorerieCard title="Aujourd'hui" recettes={rec.today} depenses={dep.today} />
          <TresorerieCard title="Ce mois" recettes={rec.month} depenses={dep.month} />
          <TresorerieCard title="Cette année" recettes={rec.year} depenses={dep.year} />
        </div>
      </section>

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

const TONES: Record<string, { bg: string; text: string }> = {
  brand: { bg: "bg-brand-light text-brand dark:bg-brand/15", text: "text-foreground" },
  ok: { bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50", text: "text-emerald-600" },
  bad: { bg: "bg-red-50 text-red-600 dark:bg-red-950/50", text: "text-red-600" },
  muted: { bg: "bg-neutral-100 text-neutral-400 dark:bg-neutral-800", text: "text-foreground" },
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
    <div className={cardCls + " flex items-center gap-3"}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.bg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-neutral-500">{label}</p>
        <p className={`text-2xl font-bold ${t.text}`}>{value}</p>
      </div>
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
                  <span className="font-medium">{money(r, c)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-red-600">
                    <IconTrendDown className="h-3.5 w-3.5" /> Dépenses
                  </span>
                  <span className="font-medium">{money(d, c)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between border-t border-neutral-200 pt-1.5 dark:border-neutral-700">
                  <span className="text-xs font-semibold">Solde · {c}</span>
                  <span className={`text-base font-bold ${net >= 0 ? "text-brand" : "text-red-600"}`}>
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
