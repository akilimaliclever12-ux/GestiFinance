import { createClient } from "@/lib/supabase/server";
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
    supabase
      .from("payments_effective")
      .select("amount, currency, paid_at")
      .gte("paid_at", firstOfYear),
    supabase
      .from("expenses_effective")
      .select("amount, currency, paid_at")
      .gte("paid_at", firstOfYear),
    supabase.from("student_solvency_status").select("student_id", { count: "exact", head: true }),
    supabase
      .from("student_solvency_status")
      .select("student_id", { count: "exact", head: true })
      .eq("is_in_order", false),
  ]);

  const mk = () => ({ today: {} as CurrencyTotals, month: {} as CurrencyTotals, year: {} as CurrencyTotals });
  const rec = mk();
  const dep = mk();
  const add = (m: CurrencyTotals, c: CurrencyCode, a: number) => {
    m[c] = (m[c] ?? 0) + Number(a);
  };
  const fill = (bucket: ReturnType<typeof mk>, rowsData: { amount: number; currency: string; paid_at: string }[] | null) => {
    for (const p of rowsData ?? []) {
      const c = p.currency as CurrencyCode;
      add(bucket.year, c, p.amount);
      if (p.paid_at >= firstOfMonth) add(bucket.month, c, p.amount);
      if (p.paid_at === todayStr) add(bucket.today, c, p.amount);
    }
  };
  fill(rec, pays);
  fill(dep, exps);

  const solvables = (totalStudents ?? 0) - (notInOrder ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord — Promoteur</h1>
        <p className="text-sm text-neutral-500">
          Recettes, dépenses et solde net de vos écoles.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Écoles" value={String(schools?.length ?? 0)} />
        <Stat label="Élèves (total)" value={String(totalStudents ?? 0)} />
        <Stat label="Solvables" value={String(solvables)} tone="ok" />
        <Stat label="Non solvables" value={String(notInOrder ?? 0)} tone={notInOrder ? "bad" : undefined} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Trésorerie
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <TresorerieCard title="Aujourd'hui" recettes={rec.today} depenses={dep.today} />
          <TresorerieCard title="Ce mois" recettes={rec.month} depenses={dep.month} />
          <TresorerieCard title="Cette année" recettes={rec.year} depenses={dep.year} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Mes écoles
        </h2>
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {(schools ?? []).map((s) => (
            <li key={s.id} className="px-4 py-3 text-sm">
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-foreground";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="mb-2 text-xs font-medium text-neutral-500">{title}</p>
      {currencies.length === 0 ? (
        <p className="text-2xl font-bold text-neutral-300 dark:text-neutral-600">—</p>
      ) : (
        <div className="space-y-3">
          {currencies.map((c) => {
            const r = recettes[c] ?? 0;
            const d = depenses[c] ?? 0;
            const net = r - d;
            return (
              <div key={c} className="border-t border-neutral-100 pt-2 first:border-0 first:pt-0 dark:border-neutral-800">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600">Recettes</span>
                  <span className="font-medium">{money(r, c)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-600">Dépenses</span>
                  <span className="font-medium">{money(d, c)}</span>
                </div>
                <div className="mt-0.5 flex justify-between border-t border-neutral-200 pt-1 dark:border-neutral-700">
                  <span className="text-xs font-semibold">Solde</span>
                  <span className={`text-sm font-bold ${net >= 0 ? "text-brand" : "text-red-600"}`}>
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
