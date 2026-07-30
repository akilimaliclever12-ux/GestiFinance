"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
