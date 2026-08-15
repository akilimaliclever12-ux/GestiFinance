import { TabNav } from "@/components/TabNav";

const TABS = [
  { href: "/owner", label: "Tableau de bord" },
  { href: "/owner/payments", label: "Paiements" },
  { href: "/owner/expenses", label: "Dépenses" },
  { href: "/owner/history", label: "Historique" },
  { href: "/owner/reports", label: "Rapports" },
  { href: "/owner/schools", label: "Écoles" },
  { href: "/owner/staff", label: "Personnel" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <TabNav tabs={TABS} />
      {children}
    </div>
  );
}
