"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { importStudents } from "../../actions";
import type { ImportRow } from "@/lib/types";
import type { SchoolRef } from "@/lib/data";
import { useOffline } from "@/lib/offline/OfflineProvider";

const inputCls =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

/** Normalise un en-tête : minuscules, sans accents, sans espaces superflus. */
function norm(s: string) {
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les accents combinants
    .trim();
}

function mapRow(raw: Record<string, unknown>): ImportRow | null {
  const entries = Object.entries(raw).map(([k, v]) => [norm(k), v] as const);
  const get = (...keys: string[]) => {
    for (const [k, v] of entries) if (keys.includes(k)) return String(v ?? "").trim();
    return "";
  };
  const row: ImportRow = {
    matricule: get("matricule", "mat", "numero", "n°", "no"),
    last_name: get("nom", "last_name", "nom de famille"),
    first_name: get("prenom", "first_name", "post-nom", "postnom"),
    class_name: get("classe", "class", "class_name") || null,
    section: get("section", "option") || null,
  };
  if (!row.matricule || !row.last_name || !row.first_name) return null;
  return row;
}

export function ImportClient({ schools }: { schools: SchoolRef[] }) {
  const { syncNow } = useOffline();
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rejected, setRejected] = useState(0);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    const mapped: ImportRow[] = [];
    let bad = 0;
    for (const r of json) {
      const m = mapRow(r);
      if (m) mapped.push(m);
      else bad++;
    }
    setRows(mapped);
    setRejected(bad);
  }

  async function onImport() {
    if (!schoolId || rows.length === 0) return;
    setBusy(true);
    setResult(null);
    const res = await importStudents(schoolId, rows);
    setBusy(false);
    if (res.error) setResult(`Erreur : ${res.error}`);
    else {
      setResult(
        `${res.inserted} élève(s) importé(s), ${res.skipped} ignoré(s) (doublons ou déjà présents).`,
      );
      void syncNow(); // rafraîchit le cache local avec les élèves importés
    }
    setRows([]);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Importer des élèves</h1>
        <Link href="/accountant/students" className="text-sm text-brand hover:underline">
          ← Retour à la liste
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-3 text-neutral-600 dark:text-neutral-300">
          Fichier <strong>.xlsx</strong> ou <strong>.csv</strong> avec les colonnes :{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            matricule, nom, prenom, classe, section
          </code>
          . La casse et les accents des en-têtes sont ignorés.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {schools.length > 1 && (
            <select
              className={inputCls}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark"
          />
        </div>
      </div>

      {(rows.length > 0 || rejected > 0) && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="mb-3 text-sm">
            <strong>{fileName}</strong> — {rows.length} ligne(s) valides,{" "}
            {rejected} ignorée(s).
          </p>
          {rows.length > 0 && (
            <div className="mb-3 max-h-64 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-neutral-800">
                  <tr>
                    <th className="px-3 py-1.5">Matricule</th>
                    <th className="px-3 py-1.5">Nom</th>
                    <th className="px-3 py-1.5">Prénom</th>
                    <th className="px-3 py-1.5">Classe</th>
                    <th className="px-3 py-1.5">Section</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-1.5 font-mono text-xs">{r.matricule}</td>
                      <td className="px-3 py-1.5">{r.last_name}</td>
                      <td className="px-3 py-1.5">{r.first_name}</td>
                      <td className="px-3 py-1.5">{r.class_name ?? "—"}</td>
                      <td className="px-3 py-1.5">{r.section ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={onImport}
            disabled={busy || rows.length === 0 || !schoolId}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Import en cours…" : `Importer ${rows.length} élève(s)`}
          </button>
        </div>
      )}

      {result && (
        <p className="rounded-lg bg-brand-light px-4 py-2 text-sm text-brand dark:bg-brand/15">
          {result}
        </p>
      )}
    </div>
  );
}
