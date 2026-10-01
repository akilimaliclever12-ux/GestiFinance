import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { fetchAll } from "@/lib/fetch-all";
import { CLASS_ORDER } from "@/lib/classes";
import { cardCls } from "@/lib/ui";
import { PrintButton } from "@/components/PrintButton";
import { EmptyState } from "@/components/EmptyState";
import { getI18n } from "@/i18n/server";
import { GenerateMissingButton } from "./GenerateMissingButton";

// Impression des codes d'accès parent d'une classe, en coupons à découper
// (nom, classe, code, lien et QR code vers /parent?code=…).

type StudentRow = {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
};

/** Clé d'URL des élèves sans classe (indépendante de la langue). */
const NO_CLASS_KEY = "__none";
const classRank = (c: string) => CLASS_ORDER[c] ?? 500;

const selectCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-neutral-700 dark:bg-neutral-800";

export default async function ParentCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; classe?: string }>;
}) {
  const sp = await searchParams;
  const { t } = await getI18n();
  const tc = t.parent.codes;
  const supabase = await createClient();
  const schools = await getMySchools();
  const schoolId = schools.some((s) => s.id === sp.school) ? sp.school! : (schools[0]?.id ?? "");
  const classe = sp.classe ?? "";

  // Adresse publique de l'app (pour le lien et le QR code)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // Classes présentes dans l'école
  const classRows = schoolId
    ? await fetchAll<{ class_name: string | null }>((a, b) =>
        supabase
          .from("students")
          .select("class_name")
          .eq("school_id", schoolId)
          .is("deleted_at", null)
          .order("id")
          .range(a, b)
          .overrideTypes<{ class_name: string | null }[], { merge: false }>(),
      )
    : [];
  const classes = [...new Set(classRows.map((r) => r.class_name ?? NO_CLASS_KEY))].sort(
    (a, b) => classRank(a) - classRank(b) || a.localeCompare(b),
  );
  const classLabel = (c: string) => (c === NO_CLASS_KEY ? tc.noClass : c);

  // Élèves de la classe choisie + leurs codes
  const [{ data: school }, students, codes] =
    schoolId && classe
      ? await Promise.all([
          supabase.from("schools").select("name, official_name, logo_url").eq("id", schoolId).single(),
          fetchAll<StudentRow>((a, b) => {
            let q = supabase
              .from("students")
              .select("id, matricule, first_name, last_name, class_name")
              .eq("school_id", schoolId)
              .is("deleted_at", null);
            q = classe === NO_CLASS_KEY ? q.is("class_name", null) : q.eq("class_name", classe);
            return q
              .order("last_name")
              .order("first_name")
              .order("id")
              .range(a, b)
              .overrideTypes<StudentRow[], { merge: false }>();
          }),
          fetchAll<{ student_id: string; code: string }>((a, b) =>
            supabase
              .from("parent_access_codes")
              .select("student_id, code")
              .eq("school_id", schoolId)
              .order("student_id")
              .range(a, b)
              .overrideTypes<{ student_id: string; code: string }[], { merge: false }>(),
          ),
        ])
      : [{ data: null }, [] as StudentRow[], [] as { student_id: string; code: string }[]];

  const codeOf = new Map(codes.map((c) => [c.student_id, c.code]));
  const withCode = students.filter((s) => codeOf.has(s.id));
  const schoolName = school ? school.official_name || school.name : "";

  // QR codes (SVG générés côté serveur, sans appel externe)
  const qr = new Map(
    await Promise.all(
      withCode.map(
        async (s) =>
          [
            s.id,
            await QRCode.toString(`${origin}/parent?code=${codeOf.get(s.id)}`, {
              type: "svg",
              margin: 0,
              errorCorrectionLevel: "M",
            }),
          ] as const,
      ),
    ),
  );

  return (
    <div className="space-y-5">
      <div className="no-print">
        <Link href="/accountant/students" className="text-sm text-brand hover:underline">
          {t.common.back}
        </Link>
        <h1 className="mt-1 text-lg font-semibold">{tc.title}</h1>
        <p className="text-sm text-neutral-500">{tc.intro}</p>
      </div>

      {/* Filtres */}
      <form method="get" className={`no-print ${cardCls}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          {schools.length > 1 && (
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">{t.common.school}</span>
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
            <span className="mb-1 block text-xs text-neutral-500">{tc.chooseClass}</span>
            <select name="classe" defaultValue={classe} className={selectCls} required>
              <option value="" disabled>
                {tc.chooseClass}
              </option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {classLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              {tc.show}
            </button>
          </div>
        </div>
      </form>

      {classe && (
        <>
          <div className={`no-print ${cardCls} space-y-3`}>
            <p className="text-sm">
              <span className="font-semibold">{classLabel(classe)}</span> —{" "}
              {tc.summary(students.length, withCode.length)}
            </p>
            <GenerateMissingButton
              schoolId={schoolId}
              className={classe === NO_CLASS_KEY ? "" : classe}
              missing={students.length - withCode.length}
            />
            <p className="text-xs text-neutral-500">{tc.existingKept}</p>
            {withCode.length > 0 && <PrintButton label={tc.print} />}
          </div>

          {students.length === 0 ? (
            <div className={cardCls}>
              <EmptyState>{tc.empty}</EmptyState>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
              {students.map((s) => {
                const code = codeOf.get(s.id);
                if (!code) {
                  return (
                    <div
                      key={s.id}
                      className="no-print rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-400 dark:border-neutral-700"
                    >
                      <p className="font-medium text-neutral-600 dark:text-neutral-300">
                        {s.last_name} {s.first_name}
                      </p>
                      <p className="text-xs">{tc.missing}</p>
                    </div>
                  );
                }
                return (
                  <div
                    key={s.id}
                    className="break-inside-avoid rounded-xl border border-dashed border-neutral-400 bg-white p-4 text-neutral-900 print:rounded-none"
                  >
                    <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                      {school?.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={school.logo_url} alt="" className="h-8 w-8 object-contain" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase">{schoolName}</p>
                        <p className="text-[10px] text-neutral-500">{tc.slipTitle}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">
                          {s.last_name} {s.first_name}
                        </p>
                        <p className="text-xs text-neutral-600">
                          {s.class_name ?? tc.noClass} · <span className="font-mono">{s.matricule}</span>
                        </p>
                        <p className="mt-2 text-[11px] text-neutral-600">{tc.slipStep1(`${host}/parent`)}</p>
                        <p className="text-[11px] text-neutral-600">{tc.slipStep2}</p>
                        <p className="font-mono text-lg font-bold tracking-widest">{code}</p>
                      </div>
                      <div
                        className="h-24 w-24 shrink-0 [&>svg]:h-full [&>svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: qr.get(s.id)! }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] italic text-neutral-500">{tc.slipNote}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
