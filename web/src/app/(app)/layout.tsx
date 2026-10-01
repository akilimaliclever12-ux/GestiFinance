import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
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
  const { t } = await getI18n();

  if (!session.profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">{t.common.unconfigured.title}</p>
          <p className="mt-2 text-sm text-neutral-500">{t.common.unconfigured.body}</p>
          <form action={logout} className="mt-4">
            <button className="text-sm text-brand underline">{t.common.logout}</button>
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
      <div className="min-h-screen bg-app">
        <AppHeader
          roleLabel={t.common.roles[profile.role]}
          displayName={profile.full_name ?? email ?? ""}
          showSync={isAccountant}
        />
        <main className="relative mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </OfflineProvider>
  );
}
