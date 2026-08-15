import { getSessionProfile } from "@/lib/auth";
import { TabNav } from "@/components/TabNav";

export default async function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  const canPayments = session?.profile?.can_payments ?? true;
  const canExpenses = session?.profile?.can_expenses ?? true;

  const tabs = [
    { href: "/accountant", label: "Accueil", show: true },
    { href: "/accountant/students", label: "Élèves", show: true },
    { href: "/accountant/fees", label: "Frais", show: true },
    { href: "/accountant/payments", label: "Paiements", show: canPayments },
    { href: "/accountant/expenses", label: "Dépenses", show: canExpenses },
  ]
    .filter((t) => t.show)
    .map(({ href, label }) => ({ href, label }));

  return (
    <div className="space-y-6">
      <TabNav tabs={tabs} />
      {children}
    </div>
  );
}
