import { createClient } from "@/lib/supabase/server";
import { getMySchools } from "@/lib/data";
import { FeeTypeForm, FeeScheduleForm, type FeeTypeRef } from "./FeeForms";
import { cardCls } from "@/lib/ui";
import type { CurrencyCode } from "@/lib/types";
import { getI18n } from "@/i18n/server";
import { formatMoney, formatIsoDate } from "@/i18n/format";

type FeeTypeRow = {
  id: string;
  name: string;
  currency: CurrencyCode;
  school_id: string;
};
type ScheduleRow = {
  id: string;
  fee_type_id: string;
  class_name: string | null;
  amount_expected: number;
  due_date: string | null;
};

export default async function FeesPage() {
  const supabase = await createClient();
  const schools = await getMySchools();
  const { locale, t } = await getI18n();
  const tf = t.accountant.fees;
  const schoolName = new Map(schools.map((s) => [s.id, s.name]));

  const [{ data: types }, { data: schedules }] = await Promise.all([
    supabase
      .from("fee_types")
      .select("id, name, currency, school_id")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("fee_schedules")
      .select("id, fee_type_id, class_name, amount_expected, due_date")
      .is("deleted_at", null),
  ]);

  const feeTypes = (types ?? []) as FeeTypeRow[];
  const rows = (schedules ?? []) as ScheduleRow[];
  const byType = new Map<string, ScheduleRow[]>();
  for (const r of rows) {
    const arr = byType.get(r.fee_type_id) ?? [];
    arr.push(r);
    byType.set(r.fee_type_id, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{tf.title}</h1>
        <p className="text-sm text-neutral-500">
          {tf.subtitle}
        </p>
      </div>

      <FeeTypeForm schools={schools} />
      <FeeScheduleForm feeTypes={feeTypes as FeeTypeRef[]} />

      <div className="space-y-4">
        {feeTypes.map((ft) => (
          <div key={ft.id} className={cardCls}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {ft.name}{" "}
                <span className="rounded bg-brand-light px-1.5 py-0.5 text-[10px] font-medium text-brand dark:bg-brand/15">
                  {ft.currency}
                </span>
              </h3>
              {schools.length > 1 && (
                <span className="text-xs text-neutral-500">
                  {schoolName.get(ft.school_id)}
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr>
                  <th className="py-1">{tf.colClass}</th>
                  <th className="py-1">{tf.colExpected}</th>
                  <th className="py-1">{tf.colDue}</th>
                </tr>
              </thead>
              <tbody>
                {(byType.get(ft.id) ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="py-1.5">{s.class_name ?? tf.allClasses}</td>
                    <td className="py-1.5 font-medium">{formatMoney(locale, s.amount_expected, ft.currency)}</td>
                    <td className="py-1.5 text-neutral-500">{s.due_date ? formatIsoDate(s.due_date) : "—"}</td>
                  </tr>
                ))}
                {(byType.get(ft.id) ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-1.5 text-neutral-500">
                      {tf.noSchedule}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
        {feeTypes.length === 0 && (
          <p className="text-sm text-neutral-500">{tf.noTypes}</p>
        )}
      </div>
    </div>
  );
}
