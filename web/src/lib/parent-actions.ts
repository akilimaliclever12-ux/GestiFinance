"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { getI18n } from "@/i18n/server";

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
