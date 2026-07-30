import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Récupère l'utilisateur authentifié et son profil applicatif (rôle, tenant). */
export async function getSessionProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, full_name, role")
    .eq("id", user.id)
    .single<Profile>();

  return { userId: user.id, email: user.email ?? null, profile: profile ?? null };
}
