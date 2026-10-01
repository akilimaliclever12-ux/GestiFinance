"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";

/** Seules les URL publiques du bucket « logos » de notre projet sont acceptées comme logo. */
const isOwnLogoUrl = (url: string) =>
  url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/`);

type State = { error?: string; success?: string; schoolId?: string } | null;

export async function createSchool(_prev: State, formData: FormData): Promise<State> {
  const ta = (await getI18n()).t.owner.actions;
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner")
    return { error: ta.ownerOnly };

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) return { error: ta.schoolNameRequired };

  const supabase = await createClient();
  const id = randomUUID();
  const { error } = await supabase.from("schools").insert({
    id,
    tenant_id: session.profile.tenant_id,
    name,
    address,
  });
  if (error) return { error: error.message };

  revalidatePath("/owner/schools");
  revalidatePath("/owner");
  // schoolId : permet au formulaire d'envoyer ensuite le logo de la nouvelle école
  return { success: ta.schoolAdded(name), schoolId: id };
}

/** Le promoteur définit l'en-tête officiel d'une école (pour les rapports). */
export async function updateSchoolLetterhead(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const ta = (await getI18n()).t.owner.actions;
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner")
    return { error: ta.ownerOnly };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: ta.schoolNotFound };

  const val = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const name = val("name");
  if (!name) return { error: ta.schoolNameRequired };

  const logo_url = val("logo_url");
  if (logo_url && !isOwnLogoUrl(logo_url)) return { error: (await getI18n()).t.owner.letterhead.logoError };

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
      logo_url,
    })
    .eq("id", id)
    .eq("tenant_id", session.profile.tenant_id);
  if (error) return { error: error.message };

  revalidatePath("/owner/schools");
  revalidatePath(`/owner/schools/${id}`);
  return { success: ta.letterheadSaved };
}

/**
 * Enregistre (ou retire, avec null) le logo d'une école, juste après son envoi
 * dans le stockage : le logo apparaît aussitôt sur les reçus et les rapports.
 */
export async function setSchoolLogo(
  schoolId: string,
  logoUrl: string | null,
): Promise<{ error?: string }> {
  const t = (await getI18n()).t.owner;
  const session = await getSessionProfile();
  if (session?.profile?.role !== "owner") return { error: t.actions.ownerOnly };

  if (logoUrl !== null && !isOwnLogoUrl(logoUrl)) return { error: t.letterhead.logoError };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .update({ logo_url: logoUrl })
    .eq("id", schoolId)
    .eq("tenant_id", session.profile.tenant_id)
    .select("id");
  if (error || !data?.length) return { error: t.letterhead.logoError };

  revalidatePath("/owner/schools");
  revalidatePath(`/owner/schools/${schoolId}`);
  return {};
}
