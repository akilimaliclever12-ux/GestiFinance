"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_BY_ROLE, type AppRole } from "@/lib/types";
import { getI18n } from "@/i18n/server";

export async function login(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { t } = await getI18n();

  if (!email || !password) {
    return { error: t.auth.login.errors.required };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: t.auth.login.errors.invalid };
  }

  // Déterminer le tableau de bord selon le rôle
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = profile?.role as AppRole | undefined;
  redirect(role ? HOME_BY_ROLE[role] : "/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
