"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { fetchAll } from "@/lib/fetch-all";

// Codes d'accès parent (migration 0017). Réservé au promoteur et au comptable ;
// la RLS de parent_access_codes et la fonction set_parent_code le garantissent
// aussi côté base.

export type ParentCode = { code: string; created_at: string } | null;

async function allowed() {
  const session = await getSessionProfile();
  const role = session?.profile?.role;
  return role === "owner" || role === "accountant";
}

export async function getParentCode(studentId: string): Promise<{ data?: ParentCode; error?: string }> {
  const { t } = await getI18n();
  if (!(await allowed())) return { error: t.parent.card.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_access_codes")
    .select("code, created_at")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) return { error: t.parent.card.error };
  return { data: data ?? null };
}

export async function generateParentCode(studentId: string): Promise<{ data?: ParentCode; error?: string }> {
  const { t } = await getI18n();
  if (!(await allowed())) return { error: t.parent.card.error };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_parent_code", { p_student: studentId });
  if (error || typeof data !== "string") return { error: t.parent.card.error };
  return { data: { code: data, created_at: new Date().toISOString() } };
}

export async function revokeParentCode(studentId: string): Promise<{ error?: string }> {
  const { t } = await getI18n();
  if (!(await allowed())) return { error: t.parent.card.error };
  const supabase = await createClient();
  const { error } = await supabase.from("parent_access_codes").delete().eq("student_id", studentId);
  if (error) return { error: t.parent.card.error };
  return {};
}

/**
 * Génère les codes manquants des élèves d'une classe (les codes existants sont
 * conservés : ils ont pu déjà être remis aux parents). `className` vide = élèves
 * sans classe. Renvoie le nombre de codes créés.
 */
export async function generateMissingParentCodes(
  schoolId: string,
  className: string,
): Promise<{ created?: number; error?: string }> {
  const { t } = await getI18n();
  if (!(await allowed())) return { error: t.parent.card.error };
  const supabase = await createClient();

  // Toutes les lignes (pagination) : un code existant manqué serait régénéré,
  // donc invalidé alors qu'il a peut-être déjà été remis au parent.
  let students: { id: string }[];
  let existing: { student_id: string }[];
  try {
    [students, existing] = await Promise.all([
      fetchAll<{ id: string }>((a, b) => {
        let q = supabase.from("students").select("id").eq("school_id", schoolId).is("deleted_at", null);
        q = className ? q.eq("class_name", className) : q.is("class_name", null);
        return q.order("id").range(a, b).overrideTypes<{ id: string }[], { merge: false }>();
      }),
      fetchAll<{ student_id: string }>((a, b) =>
        supabase
          .from("parent_access_codes")
          .select("student_id")
          .eq("school_id", schoolId)
          .order("student_id")
          .range(a, b)
          .overrideTypes<{ student_id: string }[], { merge: false }>(),
      ),
    ]);
  } catch {
    return { error: t.parent.card.error };
  }

  const has = new Set(existing.map((r) => r.student_id));
  const missing = students.map((s) => s.id).filter((id) => !has.has(id));

  // Par lots de 10 appels simultanés
  let created = 0;
  for (let i = 0; i < missing.length; i += 10) {
    const results = await Promise.all(
      missing.slice(i, i + 10).map((id) => supabase.rpc("set_parent_code", { p_student: id })),
    );
    created += results.filter((r) => !r.error).length;
    if (results.some((r) => r.error)) return { created, error: t.parent.card.error };
  }
  return { created };
}
