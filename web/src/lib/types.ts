export type AppRole = "owner" | "accountant" | "controller";

export type CurrencyCode = "CDF" | "USD" | "BIF";

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  role: AppRole;
  can_payments: boolean;
  can_expenses: boolean;
}

/** Tableau de bord d'accueil selon le rôle. */
export const HOME_BY_ROLE: Record<AppRole, string> = {
  owner: "/owner",
  accountant: "/accountant",
  controller: "/controller",
};


export type PaymentMethod = "cash" | "bank" | "mobile_money" | "other";


export const CURRENCIES: CurrencyCode[] = ["CDF", "USD", "BIF"];

/** Ligne d'import d'élève (Excel/CSV). */
export interface ImportRow {
  matricule: string;
  last_name: string;
  first_name: string;
  class_name?: string | null;
  section?: string | null;
}
