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
    { count: totalStudents },
    { count: notInOrder },
  ] = await Promise.all([
    supabase.from("schools").select("id, name").is("deleted_at", null).order("name"),
    // Paiements effectifs (non annulés) de l'année en cours
    supabase
      .from("payments_effective")
      .select("amount, currency, paid_at")
      .gte("paid_at", firstOfYear),
    supabase
      .from("student_solvency_status")
      .select("student_id", { count: "exact", head: true }),
    supabase
      .from("student_solvency_status")
      .select("student_id", { count: "exact", head: true })
      .eq("is_in_order", false),
  ]);

  // Agrégation des recettes par devise et par période
  const year: CurrencyTotals = {};
  const month: CurrencyTotals = {};
  const today: CurrencyTotals = {};
  const add = (m: CurrencyTotals, c: CurrencyCode, a: number) => {
    m[c] = (m[c] ?? 0) + Number(a);
  };
  for (const p of pays ?? []) {
    const c = p.currency as CurrencyCode;
    add(year, c, p.amount as number);
    if ((p.paid_at as string) >= firstOfMonth) add(month, c, p.amount as number);
    if ((p.paid_at as string) === todayStr) add(today, c, p.amount as number);
  }

  const solvables = (totalStudents ?? 0) - (notInOrder ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord — Promoteur</h1>
        <p className="text-sm text-neutral-500">
          Vue consolidée de vos écoles et de vos recettes.
        </p>
      </div>

      {/* Indicateurs élèves */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Écoles" value={String(schools?.length ?? 0)} />
        <Stat label="Élèves (total)" value={String(totalStudents ?? 0)} />
        <Stat
          label="Solvables"
          value={String(solvables)}
          tone="ok"
        />
        <Stat
          label="Non solvables"
          value={String(notInOrder ?? 0)}
          tone={notInOrder ? "bad" : undefined}
        />
      </section>

      {/* Recettes par devise */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Recettes
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <RecettesCard title="Aujourd'hui" totals={today} />
          <RecettesCard title="Ce mois" totals={month} />
          <RecettesCard title="Cette année" totals={year} />
        </div>
      </section>

      {/* Écoles */}
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-red-600"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function RecettesCard({
  title,
  totals,
}: {
  title: string;
  totals: CurrencyTotals;
}) {
  const entries = Object.entries(totals).filter(([, v]) => (v ?? 0) !== 0);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{title}</p>
      {entries.length === 0 ? (
        <p className="mt-1 text-2xl font-bold text-neutral-300 dark:text-neutral-600">
          —
        </p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {entries.map(([cur, val]) => (
            <li key={cur} className="text-lg font-bold text-brand">
              {money(val as number, cur)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
