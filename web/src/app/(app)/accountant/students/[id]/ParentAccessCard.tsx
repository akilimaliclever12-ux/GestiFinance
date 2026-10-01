"use client";

import { useEffect, useState, useTransition } from "react";
import { useOffline } from "@/lib/offline/OfflineProvider";
import {
  generateParentCode,
  getParentCode,
  revokeParentCode,
  type ParentCode,
} from "@/lib/parent-actions";
import { cardCls } from "@/lib/ui";
import { useI18n } from "@/i18n/client";
import { formatIsoDate } from "@/i18n/format";

const btn =
  "rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50 dark:hover:bg-brand/10";

/** Code d'accès parent de l'élève : générer, partager, régénérer, désactiver (en ligne). */
export function ParentAccessCard({
  studentId,
  studentName,
  schoolName,
}: {
  studentId: string;
  studentName: string;
  schoolName: string;
}) {
  const { t } = useI18n();
  const tc = t.parent.card;
  const { online } = useOffline();
  // undefined = pas encore chargé
  const [code, setCode] = useState<ParentCode | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!online) return;
    let alive = true;
    getParentCode(studentId).then((r) => {
      if (!alive) return;
      if (r.error) setError(r.error);
      else setCode(r.data ?? null);
    });
    return () => {
      alive = false;
    };
  }, [studentId, online]);

  const link = code ? `${window.location.origin}/parent?code=${code.code}` : "";

  function run(fn: () => Promise<{ data?: ParentCode; error?: string }>) {
    setError(null);
    setCopied(false);
    start(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else setCode(r.data ?? null);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError(tc.error);
    }
  }

  return (
    <div className={`${cardCls} no-print`}>
      <h2 className="text-sm font-semibold">{tc.title}</h2>
      <p className="mt-0.5 text-xs text-neutral-500">{tc.desc}</p>

      {!online ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{tc.offline}</p>
      ) : code === undefined && !error ? (
        <p className="mt-3 text-sm text-neutral-500">{t.common.loading}</p>
      ) : code ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="select-all rounded-lg bg-brand-light px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-brand-dark dark:bg-brand/15 dark:text-brand">
              {code.code}
            </span>
            <span className="text-xs text-neutral-500">{tc.since(formatIsoDate(code.created_at.slice(0, 10)))}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={btn}>
              {copied ? `✓ ${tc.copied}` : tc.copy}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(tc.whatsappText(studentName, schoolName, code.code, link))}`}
              target="_blank"
              rel="noopener noreferrer"
              className={btn}
            >
              {tc.whatsapp}
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm(tc.confirmRegenerate) && run(() => generateParentCode(studentId))}
              className={btn}
            >
              {tc.regenerate}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                confirm(tc.confirmRevoke) &&
                run(async () => {
                  const r = await revokeParentCode(studentId);
                  return r.error ? r : { data: null };
                })
              }
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
            >
              {tc.revoke}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-neutral-500">{tc.none}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => generateParentCode(studentId))}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {tc.generate}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
