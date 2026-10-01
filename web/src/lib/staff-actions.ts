"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/types";
import { getI18n } from "@/i18n/server";

type State = { error?: string; success?: string } | null;

async function requireOwner() {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner") return null;
  return session.profile;
}

export async function createStaff(_prev: State, formData: FormData): Promise<State> {
  const { t } = await getI18n();
  const ta = t.owner.actions;
  const owner = await requireOwner();
  if (!owner) return { error: ta.ownerOnly };
  const tenantId = owner.tenant_id;

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "accountant") as AppRole;
  const can_payments = formData.get("can_payments") != null;
  const can_expenses = formData.get("can_expenses") != null;
  const schoolIds = formData.getAll("school_ids").map((s) => String(s));

  if (!full_name || !email) return { error: ta.nameEmailRequired };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: ta.invalidEmail };
  if (password.length < 6)
    return { error: ta.passwordTooShort };
  if (role !== "accountant" && role !== "controller")
    return { error: ta.invalidRole };
  if (schoolIds.length === 0) return { error: ta.selectSchool };
  if (role === "accountant" && !can_payments && !can_expenses)
    return { error: ta.accountantNeedsPermission };

  const supabase = await createClient();
  const { data: mySchools } = await supabase
    .from("schools")
    .select("id")
    .is("deleted_at", null);
  const allowed = new Set((mySchools ?? []).map((s) => s.id as string));
  const targetSchools = schoolIds.filter((id) => allowed.has(id));
  if (targetSchools.length === 0) return { error: ta.invalidSchools };

  const admin = createAdminClient();

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (authErr || !created?.user) {
    const msg = authErr?.message ?? ta.accountCreateFailed;
    if (/already|exist|registered/i.test(msg))
      return { error: ta.emailExists(email) };
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
    return { error: ta.profileError(profErr.message) };
  }

  const links = targetSchools.map((school_id) => ({ user_id: userId, school_id }));
  const { error: linkErr } = await admin.from("user_schools").insert(links);
  if (linkErr) return { error: ta.linkError(linkErr.message) };

  revalidatePath("/owner/staff");
  return { success: ta.staffCreated(role, full_name, email) };
}

/** Le promoteur modifie les permissions d'un comptable existant. */
export async function updateStaffPermissions(
  userId: string,
  canPayments: boolean,
  canExpenses: boolean,
): Promise<{ error?: string; success?: boolean }> {
  const owner = await requireOwner();
  if (!owner) return { error: (await getI18n()).t.owner.actions.ownerOnly };

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
