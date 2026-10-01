"use client";

import { useI18n } from "@/i18n/client";

export function PrintButton({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      {label ?? t.common.print}
    </button>
  );
}
