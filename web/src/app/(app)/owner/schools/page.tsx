import { createClient } from "@/lib/supabase/server";
import { SchoolForm } from "./SchoolForm";

export default async function SchoolsPage() {
  const supabase = await createClient();

  const [{ data: schools }, { data: students }] = await Promise.all([
    supabase.from("schools").select("id, name, address").is("deleted_at", null).order("name"),
    supabase.from("students").select("school_id").is("deleted_at", null),
  ]);

  const countBySchool = new Map<string, number>();
  for (const s of students ?? [])
    countBySchool.set(s.school_id as string, (countBySchool.get(s.school_id as string) ?? 0) + 1);

  const list = (schools ?? []) as { id: string; name: string; address: string | null }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Écoles</h1>
        <p className="text-sm text-neutral-500">
          Ajoutez et consultez les établissements de votre organisation.
        </p>
      </div>

      <SchoolForm />

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Mes écoles ({list.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Adresse</th>
                <th className="px-4 py-2 text-right">Élèves</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-neutral-500">{s.address ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{countBySchool.get(s.id) ?? 0}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-neutral-500">
                    Aucune école. Ajoutez-en une ci-dessus.
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
