"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import type { CurrencyCode } from "@/lib/types";

// ------------------------------------------------------------
// Recherche d'élèves (pour le formulaire de paiement)
// ------------------------------------------------------------
export interface StudentHit {
  id: string;
  matricule: string;
  last_name: string;
  first_name: string;
  class_name: string | null;
  school_id: string;
}

export async function searchStudents(q: string): Promise<StudentHit[]> {
  const term = (q ?? "").replace(/[,()*%]/g, "").trim();
  if (term.length < 1) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, matricule, last_name, first_name, class_name, school_id")
    .is("deleted_at", null)
    .or(
      `matricule.ilike.%${term}%,last_name.ilike.%${term}%,first_name.ilike.%${term}%`,
    )
    .order("last_name")
    .limit(15);
  return (data ?? []) as StudentHit[];
}

// ------------------------------------------------------------
// Statut de solvabilité + banques (pour un élève donné)
// ------------------------------------------------------------
export interface FeeStatus {
  fee_type_id: string;
  name: string;
  currency: CurrencyCode;
  total_expected: number;
  total_paid: number;
  balance: number;
}
export interface BankRef {
  id: string;
  name: string;
}
export interface StudentFeeContext {
  school_id: string;
  fees: FeeStatus[];
  banks: BankRef[];
}

export async function getStudentFeeContext(
  student_id: string,
): Promise<StudentFeeContext | null> {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, school_id")
    .eq("id", student_id)
    .single();
  if (!student) return null;

  const [{ data: types }, { data: detail }, { data: banks }] = await Promise.all([
    supabase
      .from("fee_types")
      .select("id, name, currency")
      .eq("school_id", student.school_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("student_solvency_detail")
      .select("fee_type_id, total_expected, total_paid, balance")
      .eq("student_id", student_id),
    supabase
      .from("banks")
      .select("id, name")
      .eq("school_id", student.school_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const detailByType = new Map(
    (detail ?? []).map((d) => [d.fee_type_id as string, d]),
  );

  const fees: FeeStatus[] = (types ?? []).map((t) => {
    const d = detailByType.get(t.id as string);
    return {
      fee_type_id: t.id as string,
      name: t.name as string,
      currency: t.currency as CurrencyCode,
      total_expected: Number(d?.total_expected ?? 0),
      total_paid: Number(d?.total_paid ?? 0),
      balance: Number(d?.balance ?? 0),
    };
  });

  return {
    school_id: student.school_id as string,
    fees,
    banks: (banks ?? []) as BankRef[],
  };
}

// ------------------------------------------------------------
// Enregistrer un paiement (comptable) — append-only
// ------------------------------------------------------------
export async function createPayment(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; paymentId?: string }> {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "accountant")
    return { error: "Réservé au comptable." };
  const supabase = await createClient();

  const student_id = String(formData.get("student_id") ?? "");
  const fee_type_id = String(formData.get("fee_type_id") ?? "");
  const bank_id = String(formData.get("bank_id") ?? "") || null;
  const bordereau_no = String(formData.get("bordereau_no") ?? "").trim() || null;
  const amount = Number(formData.get("amount") ?? 0);
  const paid_at = String(formData.get("paid_at") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!student_id || !fee_type_id || !(amount > 0) || !paid_at)
    return { error: "Élève, frais, montant (> 0) et date sont obligatoires." };

  // La devise et l'école découlent du type de frais (source de vérité).
  const { data: feeType } = await supabase
    .from("fee_types")
    .select("currency, school_id")
    .eq("id", fee_type_id)
    .single();
  if (!feeType) return { error: "Type de frais introuvable." };

  const id = randomUUID();
  const { error } = await supabase.from("payment_events").insert({
    id,
    tenant_id: session.profile.tenant_id,
    school_id: feeType.school_id,
    student_id,
    fee_type_id,
    bank_id,
    event_type: "payment",
    bordereau_no,
    amount,
    currency: feeType.currency,
    paid_at,
    note,
    created_by: session.userId,
  });

  if (error) {
    if (error.code === "23505")
      return {
        error: `Le bordereau n°${bordereau_no} est déjà enregistré dans cette école (anti-doublon).`,
      };
    return { error: error.message };
  }

  revalidatePath("/accountant/payments");
  return { paymentId: id };
}

// ------------------------------------------------------------
// Annuler un paiement (promoteur) — nouvel événement d'annulation
// ------------------------------------------------------------
export async function cancelPayment(
  paymentId: string,
  reason: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner")
    return { error: "Seul le promoteur peut autoriser une annulation." };
  const supabase = await createClient();

  const { data: pay } = await supabase
    .from("payment_events")
    .select("id, tenant_id, school_id, student_id, fee_type_id, amount, currency")
    .eq("id", paymentId)
    .eq("event_type", "payment")
    .single();
  if (!pay) return { error: "Paiement introuvable." };

  const { error } = await supabase.from("payment_events").insert({
    id: randomUUID(),
    tenant_id: pay.tenant_id,
    school_id: pay.school_id,
    student_id: pay.student_id,
    fee_type_id: pay.fee_type_id,
    event_type: "cancellation",
    cancels_event_id: pay.id,
    amount: pay.amount,
    currency: pay.currency,
    paid_at: new Date().toISOString().slice(0, 10),
    note: reason || "Annulation autorisée par le promoteur",
    created_by: session.userId,
    authorized_by: session.userId,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Ce paiement est déjà annulé." };
    return { error: error.message };
  }

  revalidatePath("/owner/payments");
  return { success: true };
}
