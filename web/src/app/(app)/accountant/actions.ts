"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import type { CurrencyCode, ImportRow } from "@/lib/types";

type ActionState = { error?: string; success?: string } | null;

async function requireAccountant() {
  const session = await getSessionProfile();
  if (!session?.profile) throw new Error("Non authentifié");
  if (session.profile.role !== "accountant")
    throw new Error("Réservé au comptable");
  return session.profile;
}

// ------------------------------------------------------------
// Élèves
// ------------------------------------------------------------
export async function createStudent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAccountant();
  const supabase = await createClient();

  const school_id = String(formData.get("school_id") ?? "");
  const matricule = String(formData.get("matricule") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const first_name = String(formData.get("first_name") ?? "").trim();
  const class_name = String(formData.get("class_name") ?? "").trim() || null;
  const section = String(formData.get("section") ?? "").trim() || null;

  if (!school_id || !matricule || !last_name || !first_name) {
    return { error: "École, matricule, nom et prénom sont obligatoires." };
  }

  const { error } = await supabase.from("students").insert({
    id: randomUUID(),
    tenant_id: profile.tenant_id,
    school_id,
    matricule,
    last_name,
    first_name,
    class_name,
    section,
  });

  if (error) {
    if (error.code === "23505")
      return { error: `Le matricule « ${matricule} » existe déjà dans cette école.` };
    return { error: error.message };
  }

  revalidatePath("/accountant/students");
  return { success: `Élève ${last_name} ${first_name} enregistré.` };
}

export async function importStudents(
  school_id: string,
  rows: ImportRow[],
): Promise<{ inserted: number; skipped: number; error?: string }> {
  const profile = await requireAccountant();
  const supabase = await createClient();

  if (!school_id) return { inserted: 0, skipped: 0, error: "École manquante." };

  const clean = rows
    .map((r) => ({
      matricule: String(r.matricule ?? "").trim(),
      last_name: String(r.last_name ?? "").trim(),
      first_name: String(r.first_name ?? "").trim(),
      class_name: r.class_name?.toString().trim() || null,
      section: r.section?.toString().trim() || null,
    }))
    .filter((r) => r.matricule && r.last_name && r.first_name);

  if (clean.length === 0)
    return { inserted: 0, skipped: rows.length, error: "Aucune ligne valide." };

  const payload = clean.map((r) => ({
    id: randomUUID(),
    tenant_id: profile.tenant_id,
    school_id,
    ...r,
  }));

  // upsert sur (school_id, matricule) : ré-import idempotent, ignore les doublons.
  const { data, error } = await supabase
    .from("students")
    .upsert(payload, { onConflict: "school_id,matricule", ignoreDuplicates: true })
    .select("id");

  if (error) return { inserted: 0, skipped: rows.length, error: error.message };

  const inserted = data?.length ?? 0;
  revalidatePath("/accountant/students");
  return { inserted, skipped: rows.length - inserted };
}

// ------------------------------------------------------------
// Frais scolaires
// ------------------------------------------------------------
export async function createFeeType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAccountant();
  const supabase = await createClient();

  const school_id = String(formData.get("school_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "CDF") as CurrencyCode;

  if (!school_id || !name)
    return { error: "École et intitulé du frais obligatoires." };

  const { error } = await supabase.from("fee_types").insert({
    id: randomUUID(),
    tenant_id: profile.tenant_id,
    school_id,
    name,
    currency,
  });

  if (error) return { error: error.message };
  revalidatePath("/accountant/fees");
  return { success: `Type de frais « ${name} » créé.` };
}

export async function createFeeSchedule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAccountant();
  const supabase = await createClient();

  const school_id = String(formData.get("school_id") ?? "");
  const fee_type_id = String(formData.get("fee_type_id") ?? "");
  const class_name = String(formData.get("class_name") ?? "").trim() || null;
  const amount_expected = Number(formData.get("amount_expected") ?? 0);
  const due_date = String(formData.get("due_date") ?? "").trim() || null;

  if (!school_id || !fee_type_id || !(amount_expected >= 0))
    return { error: "École, type de frais et montant valides obligatoires." };

  const { error } = await supabase.from("fee_schedules").insert({
    id: randomUUID(),
    tenant_id: profile.tenant_id,
    school_id,
    fee_type_id,
    class_name,
    amount_expected,
    due_date,
  });

  if (error) return { error: error.message };
  revalidatePath("/accountant/fees");
  return { success: "Barème ajouté." };
}
