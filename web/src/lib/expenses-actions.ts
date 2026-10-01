"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import type { CurrencyCode } from "@/lib/types";

type ActionState = { error?: string; success?: string } | null;

async function requireAccountant() {
  const session = await getSessionProfile();
  const { t } = await getI18n();
  if (!session?.profile) throw new Error(t.accountant.actions.notAuthenticated);
  if (session.profile.role !== "accountant")
    throw new Error(t.accountant.actions.accountantOnly);
  return session;
}

// ------------------------------------------------------------
// Catégories de dépenses
// ------------------------------------------------------------
export async function createExpenseCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAccountant();
  const supabase = await createClient();
  const a = (await getI18n()).t.accountant.actions;

  const school_id = String(formData.get("school_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!school_id || !name)
    return { error: a.categoryRequired };

  const { error } = await supabase.from("expense_categories").insert({
    id: randomUUID(),
    tenant_id: session.profile!.tenant_id,
    school_id,
    name,
  });
  if (error) return { error: error.message };
  revalidatePath("/accountant/expenses");
  return { success: a.categoryCreated(name) };
}

// ------------------------------------------------------------
// Enregistrer une dépense (append-only)
// ------------------------------------------------------------
export async function createExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAccountant();
  const supabase = await createClient();
  const a = (await getI18n()).t.accountant.actions;

  const school_id = String(formData.get("school_id") ?? "");
  const category_id = String(formData.get("category_id") ?? "") || null;
  const beneficiary = String(formData.get("beneficiary") ?? "").trim() || null;
  const amount = Number(formData.get("amount") ?? 0);
  const currency = String(formData.get("currency") ?? "") as CurrencyCode;
  const payment_method = String(formData.get("payment_method") ?? "") || null;
  const reference = String(formData.get("reference") ?? "").trim() || null;
  const paid_at = String(formData.get("paid_at") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!school_id || !(amount > 0) || !currency || !paid_at)
    return { error: a.expenseRequired };

  const { error } = await supabase.from("expense_events").insert({
    id: randomUUID(),
    tenant_id: session.profile!.tenant_id,
    school_id,
    category_id,
    event_type: "expense",
    beneficiary,
    amount,
    currency,
    payment_method,
    reference,
    paid_at,
    note,
    created_by: session.userId,
  });
  if (error) return { error: error.message };
  revalidatePath("/accountant/expenses");
  return { success: a.expenseSaved };
}

// ------------------------------------------------------------
// Annuler une dépense (promoteur)
// ------------------------------------------------------------
export async function cancelExpense(
  expenseId: string,
  reason: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSessionProfile();
  const a = (await getI18n()).t.accountant.actions;
  if (session?.profile?.role !== "owner")
    return { error: a.ownerOnlyCancel };
  const supabase = await createClient();

  const { data: exp } = await supabase
    .from("expense_events")
    .select("id, tenant_id, school_id, category_id, amount, currency")
    .eq("id", expenseId)
    .eq("event_type", "expense")
    .single();
  if (!exp) return { error: a.expenseNotFound };

  const { error } = await supabase.from("expense_events").insert({
    id: randomUUID(),
    tenant_id: exp.tenant_id,
    school_id: exp.school_id,
    category_id: exp.category_id,
    event_type: "cancellation",
    cancels_event_id: exp.id,
    amount: exp.amount,
    currency: exp.currency,
    paid_at: new Date().toISOString().slice(0, 10),
    note: reason || "Annulation autorisée par le promoteur",
    created_by: session.userId,
    authorized_by: session.userId,
  });
  if (error) {
    if (error.code === "23505") return { error: a.expenseAlreadyCancelled };
    return { error: error.message };
  }
  revalidatePath("/owner/expenses");
  return { success: true };
}
