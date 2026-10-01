import { getSessionProfile } from "@/lib/auth";
import { TabNav } from "@/components/TabNav";
import { getI18n } from "@/i18n/server";

export default async function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  const { t } = await getI18n();
  const tt = t.accountant.tabs;
  const canPayments = session?.profile?.can_payments ?? true;
  const canExpenses = session?.profile?.can_expenses ?? true;

  const tabs = [
    { href: "/accountant", label: tt.home, show: true },
    { href: "/accountant/students", label: tt.students, show: true },
    { href: "/accountant/fees", label: tt.fees, show: true },
    { href: "/accountant/payments", label: tt.payments, show: canPayments },
    { href: "/accountant/expenses", label: tt.expenses, show: canExpenses },
  ]
    .filter((tab) => tab.show)
    .map(({ href, label }) => ({ href, label }));

  return (
    <div className="space-y-6">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
