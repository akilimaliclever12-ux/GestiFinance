import type { CurrencyCode } from "@/lib/types";

// Calcul de la situation d'un élève par type de frais, partagé par la fiche
// élève (base locale) et l'espace parent (fonction parent_statement).
// Même règle que la vue student_solvency_status (migration 0016) : seules
// les tranches échues (ou sans échéance) comptent pour être « en ordre ».

export interface Tranche {
  amount: number;
  due_date: string | null;
  covered: number; // part couverte par les paiements (imputés par échéance)
  is_due: boolean;
}

export interface FeeStatus {
  fee_type_id: string;
  name: string;
  currency: CurrencyCode;
  total_expected: number;
  total_paid: number;
  balance: number;
}

export interface FeeFile extends FeeStatus {
  due_expected: number; // exigible à ce jour (tranches échues ou sans échéance)
  is_in_order: boolean;
  next_due: string | null; // prochaine échéance non encore couverte
  tranches: Tranche[];
}

export interface FeeInput {
  fee_type_id: string;
  name: string;
  currency: CurrencyCode;
  /** Barèmes applicables à la classe de l'élève. */
  schedules: { amount: number; due_date: string | null }[];
  /** Total payé (paiements non annulés) pour ce type de frais. */
  paid: number;
}

/** Date du jour AAAA-MM-JJ en heure locale de l'appareil. */
export const localToday = () => new Date().toLocaleDateString("sv-SE");

export function computeFees(inputs: FeeInput[], today = localToday()): FeeFile[] {
  return inputs
    .map((f) => {
      // sans échéance d'abord, puis par date : ordre d'imputation des paiements
      const own = [...f.schedules].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
      const paid = Number(f.paid);

      let left = paid;
      const tranches: Tranche[] = own.map((s) => {
        const amount = Number(s.amount);
        const covered = Math.min(amount, Math.max(left, 0));
        left -= covered;
        return { amount, due_date: s.due_date, covered, is_due: !s.due_date || s.due_date <= today };
      });

      const expected = tranches.reduce((a, t) => a + t.amount, 0);
      const due_expected = tranches.filter((t) => t.is_due).reduce((a, t) => a + t.amount, 0);
      return {
        fee_type_id: f.fee_type_id,
        name: f.name,
        currency: f.currency,
        total_expected: expected,
        total_paid: paid,
        balance: expected - paid,
        due_expected,
        is_in_order: paid >= due_expected,
        next_due: tranches.find((t) => t.covered < t.amount && t.due_date && !t.is_due)?.due_date ?? null,
        tranches,
      };
    })
    .filter((f) => f.tranches.length > 0 || f.total_paid > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
