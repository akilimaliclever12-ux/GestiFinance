"use client";

import { SyncStatus } from "@/components/SyncStatus";
import { logout } from "@/app/login/actions";

export function AppHeader({
  roleLabel,
  displayName,
  showSync,
}: {
  roleLabel: string;
  displayName: string;
  showSync: boolean;
}) {
  return (
    <header className="no-print sticky top-0 z-20 bg-brand text-white shadow-md shadow-brand-dark/20">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-yellow font-display text-sm font-extrabold text-brand-dark">
            GF
          </span>
          <span className="font-display text-base font-bold tracking-tight">GestiFinance</span>
          <span className="shrink-0 rounded-full bg-white/18 px-2.5 py-0.5 text-xs font-medium">
            {roleLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {showSync && <SyncStatus />}
          <span className="hidden max-w-[10rem] truncate text-sm text-white/85 sm:inline">
            {displayName}
          </span>
          <form action={logout}>
            <button className="rounded-lg border border-white/50 px-2.5 py-1.5 text-sm font-medium transition hover:bg-white/10">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
