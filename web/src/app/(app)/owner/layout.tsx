import { TabNav } from "@/components/TabNav";
import { getI18n } from "@/i18n/server";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  const tt = t.owner.tabs;
  const TABS = [
    { href: "/owner", label: tt.dashboard },
    { href: "/owner/payments", label: tt.payments },
    { href: "/owner/expenses", label: tt.expenses },
    { href: "/owner/history", label: tt.history },
    { href: "/owner/reports", label: tt.reports },
    { href: "/owner/schools", label: tt.schools },
    { href: "/owner/staff", label: tt.staff },
  ];
  return (
    <div className="space-y-6">
      <TabNav tabs={TABS} />
      {children}
    </div>
  );
}
