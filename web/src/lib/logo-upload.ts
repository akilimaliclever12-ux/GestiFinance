import { createClient } from "@/lib/supabase/client";
import { setSchoolLogo } from "@/lib/schools-actions";

// Envoi du logo d'une école (navigateur → Supabase Storage, bucket « logos »),
// puis enregistrement immédiat de son URL sur l'école.
// Nom de fichier fixe « <id école>.logo » : un nouveau logo remplace l'ancien
// (pas de fichiers orphelins si l'extension change). La migration 0018 limite
// l'écriture au promoteur propriétaire de l'école, 2 Mo, PNG / JPEG / WebP.

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type LogoError = "badType" | "tooBig" | "failed";

export async function uploadSchoolLogo(
  schoolId: string,
  file: File,
): Promise<{ url: string } | { error: LogoError }> {
  if (!LOGO_TYPES.includes(file.type)) return { error: "badType" };
  if (file.size > LOGO_MAX_BYTES) return { error: "tooBig" };

  const supabase = createClient();
  const path = `${schoolId}.logo`;
  const { error } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (error) return { error: "failed" };

  // ?v= : force le rafraîchissement des images déjà en cache
  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const saved = await setSchoolLogo(schoolId, url);
  if (saved.error) return { error: "failed" };
  return { url };
}

/** Retire le logo de l'école (le fichier est laissé : il sera écrasé au prochain envoi). */
export async function removeSchoolLogo(schoolId: string): Promise<{ error?: LogoError }> {
  const saved = await setSchoolLogo(schoolId, null);
  return saved.error ? { error: "failed" } : {};
}
