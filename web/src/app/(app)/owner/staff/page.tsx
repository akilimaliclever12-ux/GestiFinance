import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { StaffForm } from "./StaffForm";

type Accountant = { id: string; full_name: string | null; email: string | null };

export default async function StaffPage() {
  const supabase = await createClient();
  const schools = await getMySchools();

  const [{ data: accountants }, { data: links }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "accountant"),
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

  const list = (accountants ?? []) as Accountant[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Comptables</h1>
        <p className="text-sm text-neutral-500">
          Créez les comptes de vos comptables et rattachez-les à leurs écoles.
        </p>
      </div>

      <StaffForm schools={schools} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Comptables existants
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Écoles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">{a.full_name ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{a.email ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-neutral-500">
                    {(byUser.get(a.id) ?? []).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-neutral-500">
                    Aucun comptable pour le moment.
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
