"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStaffPermissions } from "@/lib/staff-actions";
import { useI18n } from "@/i18n/client";

export function PermissionToggles({
  userId,
  canPayments,
  canExpenses,
}: {
  userId: string;
  canPayments: boolean;
  canExpenses: boolean;
}) {
  const [pay, setPay] = useState(canPayments);
  const [exp, setExp] = useState(canExpenses);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useI18n();
  const ts = t.owner.staff;

  function apply(nextPay: boolean, nextExp: boolean) {
    if (!nextPay && !nextExp) {
      setErr(ts.permRequired);
      return;
    }
    setErr(null);
    setPay(nextPay);
    setExp(nextExp);
    startTransition(async () => {
      const res = await updateStaffPermissions(userId, nextPay, nextExp);
      if (res.error) {
        setErr(res.error);
        setPay(canPayments);
        setExp(canExpenses);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={pay}
            disabled={pending}
            onChange={(e) => apply(e.target.checked, exp)}
            className="accent-[var(--color-brand)]"
          />
          {ts.permIncome}
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={exp}
            disabled={pending}
            onChange={(e) => apply(pay, e.target.checked)}
            className="accent-[var(--color-brand)]"
          />
          {ts.permExpenses}
        </label>
      </div>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}
