import { createClient } from "@supabase/supabase-js";
// ⚠️ Ne JAMAIS importer ce module depuis un composant client :
// la clé service_role contourne la RLS. Réservé aux Server Actions.

/**
 * Client Supabase à privilèges élevés (service_role).
 * ⚠️ SERVEUR UNIQUEMENT — la clé n'a PAS le préfixe NEXT_PUBLIC, donc elle
 * n'est jamais envoyée au navigateur. À n'utiliser que dans des Server Actions
 * gardées par une vérification de rôle (owner). Contourne la RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : ajoutez-la dans les variables d'environnement (serveur).",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
