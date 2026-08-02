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
