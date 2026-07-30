export type AppRole = "owner" | "accountant" | "controller";

export type CurrencyCode = "CDF" | "USD" | "BIF";

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  role: AppRole;
}

/** Tableau de bord d'accueil selon le rôle. */
export const HOME_BY_ROLE: Record<AppRole, string> = {
  owner: "/owner",
  accountant: "/accountant",
  controller: "/controller",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Promoteur",
  accountant: "Comptable",
  controller: "Directeur / Préfet",
};

/** Ligne d'import d'élève (Excel/CSV). */
export interface ImportRow {
  matricule: string;
  last_name: string;
  first_name: string;
  class_name?: string | null;
  section?: string | null;
}
