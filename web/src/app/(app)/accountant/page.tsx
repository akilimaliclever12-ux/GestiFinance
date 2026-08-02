import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

export default async function AccountantHome() {
  const supabase = await createClient();
  const session = await getSessionProfile();
  const canPayments = session?.profile?.can_payments ?? true;
  const canExpenses = session?.profile?.can_expenses ?? true;

  const [{ count: students }, { count: feeTypes }] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("fee_types").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Espace Comptable</h1>
        <p className="text-sm text-neutral-500">Gérez les élèves, les frais et les mouvements.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ModuleCard
          href="/accountant/students"
          title="Élèves"
          desc="Créer, importer, rechercher"
          badge={`${students ?? 0} élève(s)`}
          active
        />
        <ModuleCard
          href="/accountant/fees"
          title="Frais scolaires"
          desc="Types de frais et barèmes"
          badge={`${feeTypes ?? 0} type(s)`}
          active
        />
        {canPayments && (
          <ModuleCard
            href="/accountant/payments"
            title="Paiements"
            desc="Enregistrement des bordereaux + reçus"
            badge="Entrées"
            active
          />
        )}
        {canExpenses && (
          <ModuleCard
            href="/accountant/expenses"
            title="Dépenses"
            desc="Livre de caisse — sorties"
            badge="Sorties"
            active
          />
        )}
      </div>
    </div>
  );
}

function ModuleCard({
  href,
  title,
  desc,
  badge,
  active = false,
}: {
  href: string;
  title: string;
  desc: string;
  badge: string;
  active?: boolean;
}) {
  const inner = (
    <div
      className={`h-full rounded-xl border p-4 transition ${
        active
          ? "border-neutral-200 bg-white hover:border-brand hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          : "border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded bg-brand-light px-1.5 py-0.5 text-[10px] font-medium text-brand dark:bg-brand/15">
          {badge}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{desc}</p>
    </div>
  );
  return active ? <Link href={href}>{inner}</Link> : inner;
}
