"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushOutbox, pullAll, getLastSync } from "./sync";
import type { Ctx } from "./repo";

interface OfflineState {
  enabled: boolean;
  online: boolean;
  syncing: boolean;
  lastSync: number | null;
  ctx: Ctx;
  /** Pousse la file puis rafraîchit depuis Supabase. */
  syncNow: () => Promise<void>;
  /** Pousse la file uniquement (rapide, après une saisie). */
  flush: () => Promise<void>;
}

const OfflineContext = createContext<OfflineState | null>(null);

export function useOffline(): OfflineState {
  const c = useContext(OfflineContext);
  if (!c) throw new Error("useOffline doit être utilisé dans OfflineProvider");
  return c;
}

export function OfflineProvider({
  userId,
  tenantId,
  enabled,
  children,
}: {
  userId: string;
  tenantId: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const busy = useRef(false);

  const flush = useCallback(async () => {
    if (!enabled || !navigator.onLine) return;
    try {
      await flushOutbox();
    } catch {
      /* on réessaiera à la prochaine synchro */
    }
  }, [enabled]);

  const syncNow = useCallback(async () => {
    if (!enabled || !navigator.onLine || busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      // 1) pousser d'abord (ne pas perdre les saisies locales), 2) puis rafraîchir
      await flushOutbox();
      await pullAll();
      setLastSync(await getLastSync());
    } catch {
      /* silencieux : réessai au prochain cycle / retour réseau */
    } finally {
      setSyncing(false);
      busy.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    setOnline(navigator.onLine);
    getLastSync().then(setLastSync);

    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // synchro initiale si connecté
    if (navigator.onLine) void syncNow();

    // filet de sécurité : tentative périodique de vidage de la file
    const timer = setInterval(() => void flush(), 30000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(timer);
    };
  }, [enabled, syncNow, flush]);

  return (
    <OfflineContext.Provider
      value={{
        enabled,
        online,
        syncing,
        lastSync,
        ctx: { userId, tenantId },
        syncNow,
        flush,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
