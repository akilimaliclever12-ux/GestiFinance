import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { logout } from "@/app/login/actions";
import { Logo } from "@/components/Logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) {
    // Compte authentifié mais non rattaché à un tenant (profil manquant)
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Compte non configuré</p>
          <p className="mt-2 text-sm text-neutral-500">
            Votre compte n&apos;est rattaché à aucune organisation. Contactez
            l&apos;administrateur ECOBU.
          </p>
          <form action={logout} className="mt-4">
            <button className="text-sm text-brand underline">
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    );
  }

  const { profile, email } = session;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="no-print border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-lg font-bold tracking-tight text-brand">
              GestiFinance
            </span>
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand dark:bg-brand/15">
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-500 sm:inline">
              {profile.full_name ?? email}
            </span>
            <form action={logout}>
              <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
