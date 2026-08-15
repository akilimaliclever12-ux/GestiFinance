"use client";

import { Logo } from "@/components/Logo";
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
    <header className="no-print sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Logo size={30} />
          <span className="font-display hidden text-base font-bold text-brand sm:inline">
            GestiFinance
          </span>
          <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand dark:bg-brand/15">
            {roleLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showSync && <SyncStatus />}
          <span className="hidden max-w-[10rem] truncate text-sm text-neutral-500 md:inline">
            {displayName}
          </span>
          <form action={logout}>
            <button className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
