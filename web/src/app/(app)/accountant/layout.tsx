import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";

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
  ].filter((t) => t.show);

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-neutral-200 dark:border-neutral-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 hover:border-brand hover:text-brand dark:text-neutral-300"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
