import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import type { CurrencyCode } from "@/lib/types";
import { getI18n } from "@/i18n/server";
import { formatIsoDate, formatMoney } from "@/i18n/format";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const tr = t.receipt;
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("payment_events")
    .select(
      "id, bordereau_no, amount, currency, paid_at, created_at, note, event_type, " +
        "students(matricule, last_name, first_name, class_name, section), " +
        "fee_types(name), banks(name), schools(name, official_name, address, logo_url)",
    )
    .eq("id", id)
    .eq("event_type", "payment")
    .single();

  if (!p) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-neutral-500">{tr.notFound}</p>
        <Link href="/accountant/payments" className="mt-2 inline-block text-sm text-brand hover:underline">
          {t.common.back}
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
    schools: {
      name: string;
      official_name: string | null;
      address: string | null;
      logo_url: string | null;
    } | null;
  };

  const receiptNo = pay.bordereau_no || pay.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href="/accountant/payments" className="text-sm text-brand hover:underline">
          {tr.backToPayments}
        </Link>
        <PrintButton label={t.common.print} />
      </div>

      {/* Reçu */}
      <div className="rounded-xl border border-neutral-300 bg-white p-8 text-neutral-900 print:border-0 print:p-0">
        <header className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-3">
            {pay.schools?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pay.schools.logo_url} alt="" className="h-14 w-14 object-contain" />
            ) : (
              <Logo size={48} />
            )}
            <div>
              <p className="text-lg font-bold text-brand">
                {pay.schools?.official_name || pay.schools?.name || t.common.school}
              </p>
              {pay.schools?.address && (
                <p className="text-xs text-neutral-500">{pay.schools.address}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{tr.title}</p>
            <p className="text-xs text-neutral-500">{tr.number(receiptNo)}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 py-5 text-sm">
          <Field label={tr.student}>
            {pay.students
              ? `${pay.students.last_name} ${pay.students.first_name}`
              : t.common.none}
          </Field>
          <Field label={tr.matricule}>{pay.students?.matricule ?? t.common.none}</Field>
          <Field label={tr.className}>
            {pay.students?.class_name ?? t.common.none}
            {pay.students?.section ? ` — ${pay.students.section}` : ""}
          </Field>
          <Field label={tr.paidAt}>{formatIsoDate(pay.paid_at)}</Field>
          <Field label={tr.feeType}>{pay.fee_types?.name ?? t.common.none}</Field>
          <Field label={tr.bank}>{pay.banks?.name ?? t.common.none}</Field>
          <Field label={tr.bordereau}>{pay.bordereau_no ?? t.common.none}</Field>
          {pay.note && <Field label={tr.note}>{pay.note}</Field>}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-brand-light px-5 py-4">
          <span className="text-sm font-medium text-neutral-700">{tr.amountPaid}</span>
          <span className="text-2xl font-bold text-brand">
            {formatMoney(locale, pay.amount, pay.currency)}
          </span>
        </div>

        <footer className="mt-8 flex items-end justify-between text-xs text-neutral-500">
          <div>
            <div className="mb-1 h-10 w-40 border-b border-neutral-300" />
            {tr.signature}
          </div>
          <div className="text-right">
            <p>{tr.issuedBy}</p>
            <p>{tr.qrSoon}</p>
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
