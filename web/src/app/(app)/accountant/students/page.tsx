import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { StudentForm } from "./StudentForm";

type Student = {
  id: string;
  matricule: string;
  last_name: string;
  first_name: string;
  class_name: string | null;
  section: string | null;
  school_id: string;
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = (q ?? "").replace(/[,()*%]/g, "").trim(); // anti-injection filtre PostgREST

  const supabase = await createClient();
  const schools = await getMySchools();
  const schoolName = new Map(schools.map((s) => [s.id, s.name]));

  let query = supabase
    .from("students")
    .select("id, matricule, last_name, first_name, class_name, section, school_id")
    .is("deleted_at", null)
    .order("last_name")
    .limit(200);

  if (search) {
    query = query.or(
      `matricule.ilike.%${search}%,last_name.ilike.%${search}%,first_name.ilike.%${search}%`,
    );
  }

  const { data } = await query;
  const students = (data ?? []) as Student[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Élèves</h1>
          <p className="text-sm text-neutral-500">
            {students.length} élève(s) {search && `pour « ${search} »`}
          </p>
        </div>
        <Link
          href="/accountant/students/import"
          className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-light dark:hover:bg-brand/10"
        >
          Importer (Excel/CSV)
        </Link>
      </div>

      <StudentForm schools={schools} />

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Rechercher par matricule ou nom…"
          className="w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800"
        />
        <button className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-200 dark:text-neutral-900">
          Rechercher
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-2">Matricule</th>
              <th className="px-4 py-2">Nom complet</th>
              <th className="px-4 py-2">Classe</th>
              <th className="px-4 py-2">Section</th>
              {schools.length > 1 && <th className="px-4 py-2">École</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-mono text-xs">{s.matricule}</td>
                <td className="px-4 py-2">
                  {s.last_name} {s.first_name}
                </td>
                <td className="px-4 py-2">{s.class_name ?? "—"}</td>
                <td className="px-4 py-2">{s.section ?? "—"}</td>
                {schools.length > 1 && (
                  <td className="px-4 py-2 text-xs text-neutral-500">
                    {schoolName.get(s.school_id) ?? "—"}
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-neutral-500">
                  Aucun élève. Ajoutez-en un ci-dessus ou importez un fichier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
