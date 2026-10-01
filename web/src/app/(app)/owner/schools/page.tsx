import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SchoolForm } from "./SchoolForm";
import { getI18n } from "@/i18n/server";

export default async function SchoolsPage() {
  const supabase = await createClient();
  const { t } = await getI18n();
  const ts = t.owner.schools;

  const [{ data: schools }, { data: students }] = await Promise.all([
    supabase.from("schools").select("id, name, address, logo_url").is("deleted_at", null).order("name"),
    supabase.from("students").select("school_id").is("deleted_at", null),
  ]);

  const countBySchool = new Map<string, number>();
  for (const s of students ?? [])
    countBySchool.set(s.school_id as string, (countBySchool.get(s.school_id as string) ?? 0) + 1);

  const list = (schools ?? []) as { id: string; name: string; address: string | null; logo_url: string | null }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{ts.title}</h1>
        <p className="text-sm text-neutral-500">{ts.subtitle}</p>
      </div>

      <SchoolForm />

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {ts.mySchools(list.length)}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
              <tr>
                <th className="w-14 px-4 py-2">{ts.colLogo}</th>
                <th className="px-4 py-2">{ts.colName}</th>
                <th className="px-4 py-2">{ts.colAddress}</th>
                <th className="px-4 py-2 text-right">{ts.colStudents}</th>
                <th className="px-4 py-2">{ts.colLetterhead}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/owner/schools/${s.id}`}
                      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white text-[10px] text-neutral-400 hover:border-brand"
                    >
                      {s.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        "+"
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-neutral-500">{s.address ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{countBySchool.get(s.id) ?? 0}</td>
                  <td className="px-4 py-2">
                    <Link href={`/owner/schools/${s.id}`} className="text-brand hover:underline">
                      {ts.configure}
                    </Link>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-neutral-500">
                    {ts.empty}
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
