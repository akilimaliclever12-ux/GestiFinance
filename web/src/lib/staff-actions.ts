"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/types";

type State = { error?: string; success?: string } | null;

async function requireOwner() {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner") return null;
  return session.profile;
}

export async function createStaff(_prev: State, formData: FormData): Promise<State> {
  const owner = await requireOwner();
  if (!owner) return { error: "Réservé au promoteur." };
  const tenantId = owner.tenant_id;

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "accountant") as AppRole;
  const can_payments = formData.get("can_payments") != null;
  const can_expenses = formData.get("can_expenses") != null;
  const schoolIds = formData.getAll("school_ids").map((s) => String(s));

  if (!full_name || !email) return { error: "Nom et email obligatoires." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email invalide." };
  if (password.length < 6)
    return { error: "Le mot de passe doit faire au moins 6 caractères." };
  if (role !== "accountant" && role !== "controller")
    return { error: "Rôle invalide." };
  if (schoolIds.length === 0) return { error: "Sélectionnez au moins une école." };
  if (role === "accountant" && !can_payments && !can_expenses)
    return { error: "Un comptable doit pouvoir faire au moins les entrées ou les sorties." };

  const supabase = await createClient();
  const { data: mySchools } = await supabase
    .from("schools")
    .select("id")
    .is("deleted_at", null);
  const allowed = new Set((mySchools ?? []).map((s) => s.id as string));
  const targetSchools = schoolIds.filter((id) => allowed.has(id));
  if (targetSchools.length === 0) return { error: "Écoles invalides." };

  const admin = createAdminClient();

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

  const { error: profErr } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: tenantId,
    full_name,
    role,
    email,
    // Les permissions ne concernent que le comptable.
    can_payments: role === "accountant" ? can_payments : false,
    can_expenses: role === "accountant" ? can_expenses : false,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { error: `Profil : ${profErr.message}` };
  }

  const links = targetSchools.map((school_id) => ({ user_id: userId, school_id }));
  const { error: linkErr } = await admin.from("user_schools").insert(links);
  if (linkErr) return { error: `Rattachement écoles : ${linkErr.message}` };

  revalidatePath("/owner/staff");
  const roleLabel = role === "accountant" ? "Comptable" : "Directeur";
  return { success: `${roleLabel} ${full_name} créé (${email}).` };
}

/** Le promoteur modifie les permissions d'un comptable existant. */
export async function updateStaffPermissions(
  userId: string,
  canPayments: boolean,
  canExpenses: boolean,
): Promise<{ error?: string; success?: boolean }> {
  const owner = await requireOwner();
  if (!owner) return { error: "Réservé au promoteur." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ can_payments: canPayments, can_expenses: canExpenses })
    .eq("id", userId)
    .eq("tenant_id", owner.tenant_id)
    .eq("role", "accountant");
  if (error) return { error: error.message };

  revalidatePath("/owner/staff");
  return { success: true };
}
