"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { useOffline } from "@/lib/offline/OfflineProvider";

export function SyncStatus() {
  const { online, syncing, syncNow, enabled } = useOffline();
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);

  if (!enabled) return null;

  const dotColor = !online
    ? "bg-amber-500"
    : pending > 0 || syncing
      ? "bg-blue-500"
      : "bg-emerald-500";

  const label = !online
    ? "Hors-ligne"
    : syncing
      ? "Synchro…"
      : pending > 0
        ? `${pending} en attente`
        : "À jour";

  return (
    <button
      onClick={() => void syncNow()}
      disabled={!online || syncing}
      title={
        online
          ? "Cliquer pour synchroniser"
          : "Hors-ligne : les saisies seront envoyées au retour du réseau"
      }
      className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-default disabled:hover:bg-transparent dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <span className={`h-2 w-2 rounded-full ${dotColor} ${syncing ? "animate-pulse" : ""}`} />
      {label}
    </button>
  );
}
