"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { useOffline } from "@/lib/offline/OfflineProvider";
import { useI18n } from "@/i18n/client";

export function SyncStatus() {
  const { online, syncing, syncNow, enabled } = useOffline();
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);
  const { t } = useI18n();
  const s = t.auth.components.sync;

  if (!enabled) return null;

  const dotColor = !online
    ? "bg-white"
    : pending > 0 || syncing
      ? "bg-accent-yellow"
      : "bg-emerald-300";

  const label = !online
    ? s.offline
    : syncing
      ? s.syncing
      : pending > 0
        ? s.pending(pending)
        : s.upToDate;

  return (
    <button
      onClick={() => void syncNow()}
      disabled={!online || syncing}
      title={
        online
          ? s.clickToSync
          : s.offlineHint
      }
      className="flex items-center gap-1.5 rounded-full border border-white/40 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className={`h-2 w-2 rounded-full ${dotColor} ${syncing ? "animate-pulse" : ""}`} />
      {label}
    </button>
  );
}
