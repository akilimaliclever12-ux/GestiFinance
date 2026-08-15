"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useOffline } from "@/lib/offline/OfflineProvider";
import { listSchools, listStudents, createStudentLocal } from "@/lib/offline/repo";
import { cardCls, tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export default function StudentsPage() {
  const { ctx, flush } = useOffline();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [schoolId, setSchoolId] = useState("");

  const schools = useLiveQuery(() => listSchools(), [], []);
  const students = useLiveQuery(() => listStudents(q), [q], []);
  const schoolName = new Map(schools.map((s) => [s.id, s.name]));
  const effSchool = schoolId || schools[0]?.id || "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg({});
    const f = new FormData(e.currentTarget);
    const res = await createStudentLocal(ctx, {
      school_id: effSchool,
      matricule: String(f.get("matricule") || "").trim(),
      last_name: String(f.get("last_name") || "").trim(),
      first_name: String(f.get("first_name") || "").trim(),
      class_name: String(f.get("class_name") || "").trim() || null,
      section: String(f.get("section") || "").trim() || null,
    });
    if (res.error) setMsg({ err: res.error });
    else {
      setMsg({ ok: "Élève enregistré." });
      e.currentTarget.reset();
      void flush();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Élèves</h1>
          <p className="text-sm text-neutral-500">
            {students.length} élève(s) {q && `pour « ${q} »`}
          </p>
        </div>
        <Link
          href="/accountant/students/import"
          className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-light dark:hover:bg-brand/10"
        >
          Importer (Excel/CSV)
        </Link>
      </div>

      <form onSubmit={onSubmit} className={cardCls}>
        <h2 className="mb-3 text-sm font-semibold">Nouvel élève</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schools.length > 1 && (
            <select className={inputCls} value={effSchool} onChange={(e) => setSchoolId(e.target.value)}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <input name="matricule" placeholder="Matricule *" className={inputCls} required />
          <input name="last_name" placeholder="Nom *" className={inputCls} required />
          <input name="first_name" placeholder="Prénom *" className={inputCls} required />
          <input name="class_name" placeholder="Classe" className={inputCls} />
          <input name="section" placeholder="Section" className={inputCls} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={!effSchool}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            Enregistrer
          </button>
          {msg.err && <span className="text-sm text-red-600">{msg.err}</span>}
          {msg.ok && <span className="text-sm text-emerald-600">{msg.ok}</span>}
        </div>
      </form>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher par matricule ou nom…"
        className={inputCls + " max-w-md"}
      />

      <div className="overflow-x-auto">
        <table className={`${tableCls} min-w-[640px]`}>
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Matricule</th>
              <th className={thCls}>Nom complet</th>
              <th className={thCls}>Classe</th>
              <th className={thCls}>Section</th>
              {schools.length > 1 && <th className={thCls}>École</th>}
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {students.map((s) => (
              <tr key={s.id} className={rowCls}>
                <td className={`${tdCls} font-mono text-xs`}>{s.matricule}</td>
                <td className={tdCls}>
                  {s.last_name} {s.first_name}
                </td>
                <td className={tdCls}>{s.class_name ?? "—"}</td>
                <td className={tdCls}>{s.section ?? "—"}</td>
                {schools.length > 1 && (
                  <td className={`${tdCls} text-xs text-neutral-500`}>
                    {schoolName.get(s.school_id) ?? "—"}
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState>Aucun élève. Ajoutez-en un ci-dessus ou importez un fichier.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
