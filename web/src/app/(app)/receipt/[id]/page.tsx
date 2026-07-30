import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { PrintButton } from "./PrintButton";
import type { CurrencyCode } from "@/lib/types";

const money = (n: number, c: string) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + c;

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("payment_events")
    .select(
      "id, bordereau_no, amount, currency, paid_at, created_at, note, event_type, " +
        "students(matricule, last_name, first_name, class_name, section), " +
        "fee_types(name), banks(name), schools(name, address)",
    )
    .eq("id", id)
    .eq("event_type", "payment")
    .single();

  if (!p) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-neutral-500">Reçu introuvable ou accès non autorisé.</p>
        <Link href="/accountant/payments" className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Retour
        </Link>
      </div>
    );
  }

  const pay = p as unknown as {
    id: string;
    bordereau_no: string | null;
    amount: number;
    currency: CurrencyCode;
    paid_at: string;
    note: string | null;
    students: {
      matricule: string;
      last_name: string;
      first_name: string;
      class_name: string | null;
      section: string | null;
    } | null;
    fee_types: { name: string } | null;
    banks: { name: string } | null;
    schools: { name: string; address: string | null } | null;
  };

  const receiptNo = pay.bordereau_no || pay.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href="/accountant/payments" className="text-sm text-brand hover:underline">
          ← Retour aux paiements
        </Link>
        <PrintButton />
      </div>

      {/* Reçu */}
      <div className="rounded-xl border border-neutral-300 bg-white p-8 text-neutral-900 print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <div>
              <p className="text-lg font-bold text-brand">
                {pay.schools?.name ?? "École"}
              </p>
              {pay.schools?.address && (
                <p className="text-xs text-neutral-500">{pay.schools.address}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">REÇU DE PAIEMENT</p>
            <p className="text-xs text-neutral-500">N° {receiptNo}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 py-5 text-sm">
          <Field label="Élève">
            {pay.students
              ? `${pay.students.last_name} ${pay.students.first_name}`
              : "—"}
          </Field>
          <Field label="Matricule">{pay.students?.matricule ?? "—"}</Field>
          <Field label="Classe">
            {pay.students?.class_name ?? "—"}
            {pay.students?.section ? ` — ${pay.students.section}` : ""}
          </Field>
          <Field label="Date de paiement">{pay.paid_at}</Field>
          <Field label="Type de frais">{pay.fee_types?.name ?? "—"}</Field>
          <Field label="Banque">{pay.banks?.name ?? "—"}</Field>
          <Field label="N° bordereau">{pay.bordereau_no ?? "—"}</Field>
          {pay.note && <Field label="Note">{pay.note}</Field>}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-brand-light px-5 py-4">
          <span className="text-sm font-medium text-neutral-700">Montant payé</span>
          <span className="text-2xl font-bold text-brand">
            {money(pay.amount, pay.currency)}
          </span>
        </div>

        <footer className="mt-8 flex items-end justify-between text-xs text-neutral-500">
          <div>
            <div className="mb-1 h-10 w-40 border-b border-neutral-300" />
            Signature du comptable
          </div>
          <div className="text-right">
            <p>Émis via GestiFinance</p>
            <p>Vérification QR — à venir</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}
