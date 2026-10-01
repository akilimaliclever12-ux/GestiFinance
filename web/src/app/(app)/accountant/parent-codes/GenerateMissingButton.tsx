"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateMissingParentCodes } from "@/lib/parent-actions";
import { useOffline } from "@/lib/offline/OfflineProvider";
import { useI18n } from "@/i18n/client";

/** Génère en une fois les codes des élèves de la classe qui n'en ont pas. */
export function GenerateMissingButton({
  schoolId,
  className,
  missing,
}: {
  schoolId: string;
  className: string;
  missing: number;
}) {
  const { t } = useI18n();
  const tc = t.parent.codes;
  const { online } = useOffline();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  if (missing === 0 && !msg.ok) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {missing > 0 && (
        <button
          type="button"
          disabled={pending || !online}
          onClick={() =>
            start(async () => {
              setMsg({});
              const r = await generateMissingParentCodes(schoolId, className);
              if (r.error) setMsg({ err: r.error });
              else setMsg({ ok: tc.generated(r.created ?? 0) });
              router.refresh();
            })
          }
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? tc.generating : tc.generateMissing(missing)}
        </button>
      )}
      {!online && <span className="text-sm text-amber-700 dark:text-amber-400">{tc.online}</span>}
      {msg.ok && <span className="text-sm text-emerald-600">{msg.ok}</span>}
      {msg.err && <span className="text-sm text-red-600">{msg.err}</span>}
    </div>
  );
}
