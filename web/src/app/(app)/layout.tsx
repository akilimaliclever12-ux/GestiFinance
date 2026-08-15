import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { logout } from "@/app/login/actions";
import { AppHeader } from "@/components/AppHeader";
import { OfflineProvider } from "@/lib/offline/OfflineProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  if (!session.profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Compte non configuré</p>
          <p className="mt-2 text-sm text-neutral-500">
            Votre compte n&apos;est rattaché à aucune organisation. Contactez
            l&apos;administrateur ECOBU.
          </p>
          <form action={logout} className="mt-4">
            <button className="text-sm text-brand underline">Se déconnecter</button>
          </form>
        </div>
      </main>
    );
  }

  const { profile, email } = session;
  const isAccountant = profile.role === "accountant";

  return (
    <OfflineProvider
      userId={session.userId}
      tenantId={profile.tenant_id}
      enabled={isAccountant}
      canPayments={profile.can_payments}
      canExpenses={profile.can_expenses}
    >
      <div className="relative min-h-screen bg-app">
        {/* Halo de marque discret en haut de page */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand/[0.07] to-transparent dark:from-brand/[0.10]" />
        <AppHeader
          roleLabel={ROLE_LABELS[profile.role]}
          displayName={profile.full_name ?? email ?? ""}
          showSync={isAccountant}
        />
        <main className="relative mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </OfflineProvider>
  );
}
