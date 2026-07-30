import { db, PULL_TABLES, type OutboxItem } from "./db";
import { createClient } from "@/lib/supabase/client";

/**
 * Synchronisation Offline-First (stratégie append-only + Last-Write-Wins).
 * - pull  : recopie les données Supabase accessibles (filtrées par RLS) dans Dexie.
 * - push  : rejoue la file outbox vers Supabase (UUID générés côté client → idempotent).
 */

export async function pullAll(): Promise<void> {
  const supabase = createClient();
  for (const t of PULL_TABLES) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) throw new Error(`pull ${t}: ${error.message}`);
    await db.table(t).clear();
    if (data && data.length) await db.table(t).bulkPut(data);
  }
  // Devise par défaut du tenant (pour préremplir les formulaires)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("default_currency")
    .limit(1)
    .maybeSingle();
  if (tenant?.default_currency)
    await db.meta.put({ key: "defaultCurrency", value: tenant.default_currency });

  await db.meta.put({ key: "lastSync", value: Date.now() });
}

/** Écrit en local (optimiste) ET met en file pour synchro. */
export async function enqueueInsert(
  table: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.table(table).put(payload);
  await db.outbox.add({ table, payload, createdAt: Date.now() });
}

export interface FlushResult {
  pushed: number;
  failed: number;
}

/** Rejoue la file vers Supabase. Idempotent : un doublon (23505) = déjà synchronisé. */
export async function flushOutbox(): Promise<FlushResult> {
  const supabase = createClient();
  const items: OutboxItem[] = await db.outbox.orderBy("createdAt").toArray();
  let pushed = 0;
  let failed = 0;

  for (const item of items) {
    const { error } = await supabase.from(item.table).insert(item.payload);
    if (!error || error.code === "23505") {
      // succès, ou la ligne existe déjà (même UUID) → considéré synchronisé
      if (item.id != null) await db.outbox.delete(item.id);
      pushed++;
    } else {
      failed++;
      if (item.id != null) {
        await db.outbox.update(item.id, { lastError: error.message });
      }
    }
  }
  return { pushed, failed };
}

export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}

export async function getLastSync(): Promise<number | null> {
  const row = await db.meta.get("lastSync");
  return (row?.value as number) ?? null;
}
