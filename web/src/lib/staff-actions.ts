"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type State = { error?: string; success?: string } | null;

export async function createAccountant(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner")
    return { error: "Réservé au promoteur." };
  const tenantId = session.profile.tenant_id;

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const schoolIds = formData.getAll("school_ids").map((s) => String(s));

  if (!full_name || !email) return { error: "Nom et email obligatoires." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Email invalide." };
  if (password.length < 6)
    return { error: "Le mot de passe doit faire au moins 6 caractères." };
  if (schoolIds.length === 0)
    return { error: "Sélectionnez au moins une école." };

  // Vérifier que les écoles appartiennent bien au tenant du promoteur.
  const supabase = await createClient();
  const { data: mySchools } = await supabase
    .from("schools")
    .select("id")
    .is("deleted_at", null);
  const allowed = new Set((mySchools ?? []).map((s) => s.id as string));
  const targetSchools = schoolIds.filter((id) => allowed.has(id));
  if (targetSchools.length === 0)
    return { error: "Écoles invalides." };

  const admin = createAdminClient();

  // 1) Créer le compte Auth (email confirmé d'office).
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

  // 2) Profil comptable.
  const { error: profErr } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: tenantId,
    full_name,
    role: "accountant",
    email,
  });
  if (profErr) {
    // Nettoyage : supprimer l'utilisateur Auth si le profil échoue.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { error: `Profil : ${profErr.message}` };
  }

  // 3) Rattachement aux écoles.
  const links = targetSchools.map((school_id) => ({ user_id: userId, school_id }));
  const { error: linkErr } = await admin.from("user_schools").insert(links);
  if (linkErr) return { error: `Rattachement écoles : ${linkErr.message}` };

  revalidatePath("/owner/staff");
  return { success: `Comptable ${full_name} créé (${email}).` };
}
