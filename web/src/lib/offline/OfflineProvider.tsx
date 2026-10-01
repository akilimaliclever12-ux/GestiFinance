"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushOutbox, pullAll, getLastSync } from "./sync";
import type { Ctx } from "./repo";

interface OfflineState {
  enabled: boolean;
  online: boolean;
  syncing: boolean;
  lastSync: number | null;
  ctx: Ctx;
  /** Permissions du comptable courant. */
  perms: { canPayments: boolean; canExpenses: boolean };
  /** Pousse la file puis rafraîchit depuis Supabase. */
  syncNow: () => Promise<void>;
  /** Pousse la file uniquement (rapide, après une saisie). */
  flush: () => Promise<void>;
}

const OfflineContext = createContext<OfflineState | null>(null);

// État réseau du navigateur (online/offline), lu comme une source externe.
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const getOnline = () => navigator.onLine;
const getOnlineServer = () => true;

export function useOffline(): OfflineState {
  const c = useContext(OfflineContext);
  if (!c) throw new Error("useOffline doit être utilisé dans OfflineProvider");
  return c;
}

export function OfflineProvider({
  userId,
  tenantId,
  enabled,
  canPayments = true,
  canExpenses = true,
  children,
}: {
  userId: string;
  tenantId: string;
  enabled: boolean;
  canPayments?: boolean;
  canExpenses?: boolean;
  children: React.ReactNode;
}) {
  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);
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
    getLastSync().then(setLastSync);

    // synchro au retour du réseau
    const onOnline = () => void syncNow();
    window.addEventListener("online", onOnline);

    // synchro initiale si connecté (juste après le premier rendu)
    const initial = setTimeout(() => {
      if (navigator.onLine) void syncNow();
    }, 0);

    // filet de sécurité : tentative périodique de vidage de la file
    const timer = setInterval(() => void flush(), 30000);

    return () => {
      window.removeEventListener("online", onOnline);
      clearTimeout(initial);
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
        perms: { canPayments, canExpenses },
        syncNow,
        flush,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
