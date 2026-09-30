"use client";

export function PrintButton({ label = "Imprimer / Enregistrer en PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      {label}
    </button>
  );
}
