import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { StaffForm } from "./StaffForm";
import { PermissionToggles } from "./PermissionToggles";
import { ROLE_LABELS, type AppRole } from "@/lib/types";

type Staff = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  can_payments: boolean;
  can_expenses: boolean;
};

export default async function StaffPage() {
  const supabase = await createClient();
  const schools = await getMySchools();

  const [{ data: staff }, { data: links }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, can_payments, can_expenses")
      .in("role", ["accountant", "controller"]),
    supabase.from("user_schools").select("user_id, schools(name)"),
  ]);

  const byUser = new Map<string, string[]>();
  for (const l of (links ?? []) as unknown as {
    user_id: string;
    schools: { name: string } | null;
  }[]) {
    if (!l.schools) continue;
    const arr = byUser.get(l.user_id) ?? [];
    arr.push(l.schools.name);
    byUser.set(l.user_id, arr);
  }

  const list = (staff ?? []) as Staff[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Personnel</h1>
        <p className="text-sm text-neutral-500">
          Créez vos comptables et directeurs, attribuez leurs écoles et restreignez
          leurs autorisations.
        </p>
      </div>

      <StaffForm schools={schools} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Utilisateurs existants
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Écoles</th>
                <th className="px-4 py-2">Autorisations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {list.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{u.email ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-brand-light px-1.5 py-0.5 text-[11px] font-medium text-brand dark:bg-brand/15">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-500">
                    {(byUser.get(u.id) ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2">
                    {u.role === "accountant" ? (
                      <PermissionToggles
                        userId={u.id}
                        canPayments={u.can_payments}
                        canExpenses={u.can_expenses}
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-neutral-500">
                    Aucun utilisateur pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
