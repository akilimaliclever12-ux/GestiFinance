import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { fetchAll } from "@/lib/fetch-all";
import { CLASS_ORDER } from "@/lib/classes";
import { Letterhead, type SchoolLetterhead } from "@/components/Letterhead";
import { PrintButton } from "@/components/PrintButton";
import { EmptyState } from "@/components/EmptyState";
import { cardCls, tableCls, theadCls, tbodyCls, rowCls, thCls, tdCls } from "@/lib/ui";

type StatusRow = {
  student_id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  section: string | null;
  is_in_order: boolean;
};

type Status = "tous" | "ok" | "ko";

const NO_CLASS = "Sans classe";
const classOf = (r: StatusRow) => r.class_name || NO_CLASS;
const classRank = (c: string) => CLASS_ORDER[c] ?? (c === NO_CLASS ? 999 : 500);
const byClass = (a: string, b: string) => classRank(a) - classRank(b) || a.localeCompare(b);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const selectCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export default async function ControllerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; classe?: string; statut?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const schools = await getMySchools();

  const schoolId = sp.school || schools[0]?.id || "";
  const classe = sp.classe || "";
  const statut: Status = sp.statut === "ok" || sp.statut === "ko" ? sp.statut : "tous";
  const q = (sp.q || "").trim();

  // Vue SANS montants : le directeur ne voit que le statut.
  const [{ data: school }, all] = schoolId
    ? await Promise.all([
        supabase
          .from("schools")
          .select("name, official_name, header_top, sub_header, motto, address, phone, email, bp, logo_url")
          .eq("id", schoolId)
          .single(),
        fetchAll<StatusRow>((a, b) =>
          supabase
            .from("student_solvency_status")
            .select("student_id, matricule, first_name, last_name, class_name, section, is_in_order")
            .eq("school_id", schoolId)
            .order("last_name")
            .order("first_name")
            .order("student_id")
            .range(a, b)
            .overrideTypes<StatusRow[], { merge: false }>(),
        ),
      ])
    : [{ data: null }, [] as StatusRow[]];

  // Synthèse par classe (sur toute l'école, indépendamment des filtres)
  const perClass = new Map<string, { total: number; ok: number }>();
  for (const r of all) {
    const c = perClass.get(classOf(r)) ?? { total: 0, ok: 0 };
    c.total++;
    if (r.is_in_order) c.ok++;
    perClass.set(classOf(r), c);
  }
  const classes = [...perClass.keys()].sort(byClass);

  const scope = classe ? all.filter((r) => classOf(r) === classe) : all;
  const okCount = scope.filter((r) => r.is_in_order).length;
  const koCount = scope.length - okCount;
  const pct = scope.length ? Math.round((okCount / scope.length) * 100) : 0;

  const nq = norm(q);
  const rows = scope
    .filter((r) => (statut === "ok" ? r.is_in_order : statut === "ko" ? !r.is_in_order : true))
    .filter((r) => !nq || norm(`${r.matricule} ${r.last_name} ${r.first_name}`).includes(nq))
    .sort((a, b) => byClass(classOf(a), classOf(b)));

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ school: schoolId, classe, statut, q, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v || (k === "statut" && v === "tous")) p.delete(k);
    return `/controller?${p}`;
  };

  const today = new Date().toLocaleDateString("fr-FR");
  const printTitle =
    statut === "ko"
      ? "LISTE DES ÉLÈVES NON EN ORDRE"
      : statut === "ok"
        ? "LISTE DES ÉLÈVES EN ORDRE"
        : "STATUT DE SOLVABILITÉ DES ÉLÈVES";

  return (
    <div className="space-y-5">
      <div className="no-print">
        <h1 className="text-xl font-semibold">Contrôle de solvabilité</h1>
        <p className="text-sm text-neutral-500">
          Statut des élèves pour l&apos;accès aux cours et aux examens — sans aucun montant.
        </p>
      </div>

      {/* Filtres */}
      <form method="get" className={`no-print ${cardCls}`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {schools.length > 1 && (
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">École</span>
              <select name="school" defaultValue={schoolId} className={selectCls}>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Classe</span>
            <select name="classe" defaultValue={classe} className={selectCls}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Statut</span>
            <select name="statut" defaultValue={statut} className={selectCls}>
              <option value="tous">Tous</option>
              <option value="ko">Non en ordre</option>
              <option value="ok">En ordre</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Recherche</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Nom ou matricule"
              className={selectCls}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Afficher
          </button>
          <PrintButton label="Imprimer la liste" />
        </div>
      </form>

      {/* Indicateurs */}
      <div className="no-print grid grid-cols-3 gap-3">
        <Stat label={classe || "Élèves"} value={scope.length} />
        <Stat label="En ordre" value={okCount} hint={`${pct} %`} tone="ok" href={href({ statut: "ok" })} />
        <Stat label="Non en ordre" value={koCount} tone="ko" href={href({ statut: "ko" })} />
      </div>

      {/* Synthèse par classe */}
      {!classe && classes.length > 1 && (
        <div className="no-print overflow-x-auto">
          <table className={tableCls}>
            <thead className={theadCls}>
              <tr>
                <th className={thCls}>Classe</th>
                <th className={`${thCls} text-right`}>Effectif</th>
                <th className={`${thCls} text-right`}>En ordre</th>
                <th className={`${thCls} text-right`}>Non en ordre</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {classes.map((c) => {
                const s = perClass.get(c)!;
                return (
                  <tr key={c} className={rowCls}>
                    <td className={tdCls}>
                      <Link href={href({ classe: c })} className="font-medium text-brand hover:underline">
                        {c}
                      </Link>
                    </td>
                    <td className={`${tdCls} text-right`}>{s.total}</td>
                    <td className={`${tdCls} text-right text-emerald-600`}>{s.ok}</td>
                    <td className={`${tdCls} text-right font-semibold text-red-600`}>
                      {s.total - s.ok > 0 ? (
                        <Link href={href({ classe: c, statut: "ko" })} className="hover:underline">
                          {s.total - s.ok}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Liste (également imprimable) */}
      <div className="print:text-neutral-900">
        {school && (
          <div className="mb-4 hidden print:block">
            <Letterhead school={school as SchoolLetterhead} />
            <div className="mt-3 text-center">
              <p className="text-base font-bold">{printTitle}</p>
              <p className="text-xs text-neutral-600">
                {classe || "Toutes les classes"} — situation au {today} — {rows.length} élève(s)
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className={`${tableCls} print:rounded-none print:border-neutral-400 print:shadow-none`}>
            <thead className={theadCls}>
              <tr>
                <th className={`${thCls} w-10 text-right`}>#</th>
                <th className={thCls}>Matricule</th>
                <th className={thCls}>Nom</th>
                {!classe && <th className={thCls}>Classe</th>}
                <th className={thCls}>Statut</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {rows.map((r, i) => (
                <tr key={r.student_id} className={`${rowCls} break-inside-avoid`}>
                  <td className={`${tdCls} text-right text-neutral-400`}>{i + 1}</td>
                  <td className={`${tdCls} font-mono text-xs`}>{r.matricule}</td>
                  <td className={tdCls}>
                    <span className="font-medium">{r.last_name}</span> {r.first_name}
                  </td>
                  {!classe && (
                    <td className={`${tdCls} text-neutral-600 dark:text-neutral-400`}>
                      {r.class_name ?? "—"}
                      {r.section && <span className="text-neutral-400"> · {r.section}</span>}
                    </td>
                  )}
                  <td className={tdCls}>
                    {r.is_in_order ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 print:bg-transparent print:px-0">
                        ● En ordre
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400 print:bg-transparent print:px-0">
                        ● Non en ordre
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>
                      {all.length === 0
                        ? "Aucun élève enregistré pour cette école."
                        : "Aucun élève ne correspond à ces critères."}
                    </EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {school && (
          <footer className="mt-10 hidden items-end justify-between text-xs text-neutral-500 print:flex">
            <div>
              <div className="mb-1 h-10 w-44 border-b border-neutral-300" />
              Le Directeur / Préfet
            </div>
            <p>Édité via GestiFinance</p>
          </footer>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "ok" | "ko";
  href?: string;
}) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "ko" ? "text-red-600" : "";
  const body = (
    <>
      <p className="truncate text-xs text-neutral-500">{label}</p>
      <p className={`font-display text-2xl font-bold ${color}`}>
        {value}
        {hint && <span className="ml-1.5 text-xs font-medium text-neutral-400">{hint}</span>}
      </p>
    </>
  );
  return href ? (
    <Link href={href} className={`${cardCls} block transition hover:border-brand`}>
      {body}
    </Link>
  ) : (
    <div className={cardCls}>{body}</div>
  );
}
