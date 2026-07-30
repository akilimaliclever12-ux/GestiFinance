"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPayment } from "@/lib/payments-actions";
import { cancelExpense } from "@/lib/expenses-actions";

export function CancelActionButton({
  kind,
  id,
}: {
  kind: "payment" | "expense";
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res =
        kind === "payment"
          ? await cancelPayment(id, reason.trim())
          : await cancelExpense(id, reason.trim());
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40"
      >
        Annuler
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif de l'annulation"
        className="w-44 rounded border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800"
      />
      <div className="flex gap-1">
        <button
          onClick={confirm}
          disabled={pending}
          className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "…" : "Confirmer"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          Non
        </button>
      </div>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
