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
    <header className="no-print border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-lg font-bold tracking-tight text-brand">GestiFinance</span>
          <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand dark:bg-brand/15">
            {roleLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {showSync && <SyncStatus />}
          <span className="hidden text-sm text-neutral-500 sm:inline">{displayName}</span>
          <form action={logout}>
            <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
