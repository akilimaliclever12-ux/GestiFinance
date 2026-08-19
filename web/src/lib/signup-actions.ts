"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrencyCode } from "@/lib/types";

type State = { error?: string } | null;

/**
 * Inscription en libre-service : crée le compte promoteur, son espace
 * (tenant) et le connecte automatiquement. Chaque inscription crée un
 * NOUVEL espace isolé — aucune donnée partagée entre espaces.
 */
export async function signUpOwner(_prev: State, formData: FormData): Promise<State> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const org = String(formData.get("org") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const currency = (String(formData.get("currency") ?? "CDF")) as CurrencyCode;

  if (!full_name || !org || !email)
    return { error: "Nom, espace et email sont obligatoires." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Email invalide." };
  if (password.length < 6)
    return { error: "Le mot de passe doit faire au moins 6 caractères." };

  const admin = createAdminClient();

  // 1) Compte Auth (confirmé d'office pour un accès immédiat)
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (authErr || !created?.user) {
    const msg = authErr?.message ?? "Création du compte impossible.";
    if (/already|exist|registered/i.test(msg))
      return { error: `Un compte existe déjà avec l'email ${email}.` };
    return { error: msg };
  }
  const userId = created.user.id;

  // 2) Espace (tenant)
  const { data: tenant, error: tErr } = await admin
    .from("tenants")
    .insert({ name: org, default_currency: currency })
    .select("id")
    .single();
  if (tErr || !tenant) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { error: `Espace : ${tErr?.message ?? "création impossible"}` };
  }

  // 3) Profil promoteur (owner) rattaché à l'espace
  const { error: pErr } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: tenant.id,
    full_name,
    role: "owner",
    email,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { error: `Profil : ${pErr.message}` };
  }

  // 4) Connexion automatique (pose le cookie de session)
  const supabase = await createClient();
  const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
  if (sErr) redirect("/login");
  redirect("/owner");
}
