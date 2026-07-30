import Link from "next/link";

const TABS = [
  { href: "/accountant", label: "Accueil" },
  { href: "/accountant/students", label: "Élèves" },
  { href: "/accountant/fees", label: "Frais" },
  { href: "/accountant/payments", label: "Paiements" },
];

export default function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 hover:border-brand hover:text-brand dark:text-neutral-300"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
