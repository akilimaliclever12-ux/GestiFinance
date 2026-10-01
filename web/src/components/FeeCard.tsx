"use client";

import type { FeeFile } from "@/lib/solvency";
import { cardCls } from "@/lib/ui";
import { useI18n } from "@/i18n/client";
import { formatMoney, formatIsoDate as frDate } from "@/i18n/format";

/** Carte d'un type de frais : attendu, payé, reste, tranches (fiche élève + espace parent). */
export function FeeCard({ fee: f }: { fee: FeeFile }) {
  const { locale, t } = useI18n();
  const tf = t.accountant.file;
  const money = (n: number, cur: string) => formatMoney(locale, n, cur);
  const c = f.currency;
  const dueLeft = Math.max(f.due_expected - f.total_paid, 0);
  const pct = f.total_expected > 0 ? Math.min(100, Math.round((f.total_paid / f.total_expected) * 100)) : 100;

  return (
    <div className={`${cardCls} break-inside-avoid`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{f.name}</p>
        {f.is_in_order ? (
          <span className="text-xs font-medium text-emerald-600">{tf.inOrder}</span>
        ) : (
          <span className="text-xs font-medium text-red-600">{tf.overdueUnpaid(money(dueLeft, c))}</span>
        )}
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-neutral-500">{tf.expectedYear}</dt>
          <dd className="font-medium">{money(f.total_expected, c)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{tf.paid}</dt>
          <dd className="font-medium text-emerald-600">{money(f.total_paid, c)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{tf.remaining}</dt>
          <dd className={`font-semibold ${f.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {money(Math.max(f.balance, 0), c)}
          </dd>
        </div>
      </dl>

      {f.tranches.length > 1 && (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2 text-xs dark:border-neutral-800">
          {f.tranches.map((tr, i) => {
            const done = tr.covered >= tr.amount;
            return (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-neutral-500">
                  {tf.tranche(i + 1)}
                  {tr.due_date ? tf.dueOn(frDate(tr.due_date)) : tf.dueNow}
                </span>
                <span
                  className={
                    done
                      ? "text-emerald-600"
                      : tr.is_due
                        ? "font-medium text-red-600"
                        : "text-neutral-500"
                  }
                >
                  {done
                    ? `✓ ${money(tr.amount, c)}`
                    : `${money(tr.covered, c)} / ${money(tr.amount, c)}${tr.is_due ? "" : tf.upcoming}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {f.next_due && (
        <p className="mt-2 text-xs text-neutral-500">{tf.nextDue(frDate(f.next_due))}</p>
      )}
    </div>
  );
}
