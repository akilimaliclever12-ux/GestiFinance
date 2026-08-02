"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string; success?: string } | null;

export async function createSchool(_prev: State, formData: FormData): Promise<State> {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner")
    return { error: "Réservé au promoteur." };

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) return { error: "Le nom de l'école est obligatoire." };

  const supabase = await createClient();
  const { error } = await supabase.from("schools").insert({
    id: randomUUID(),
    tenant_id: session.profile.tenant_id,
    name,
    address,
  });
  if (error) return { error: error.message };

  revalidatePath("/owner/schools");
  revalidatePath("/owner");
  return { success: `École « ${name} » ajoutée.` };
}

/** Le promoteur définit l'en-tête officiel d'une école (pour les rapports). */
export async function updateSchoolLetterhead(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner")
    return { error: "Réservé au promoteur." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "École introuvable." };

  const val = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const name = val("name");
  if (!name) return { error: "Le nom de l'école est obligatoire." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({
      name,
      official_name: val("official_name"),
      header_top: val("header_top"),
      sub_header: val("sub_header"),
      motto: val("motto"),
      address: val("address"),
      phone: val("phone"),
      email: val("email"),
      bp: val("bp"),
      logo_url: val("logo_url"),
    })
    .eq("id", id)
    .eq("tenant_id", session.profile.tenant_id);
  if (error) return { error: error.message };

  revalidatePath("/owner/schools");
  revalidatePath(`/owner/schools/${id}`);
  return { success: "En-tête enregistré." };
}
