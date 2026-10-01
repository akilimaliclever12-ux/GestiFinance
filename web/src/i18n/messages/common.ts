// Textes partagés : en-tête, rôles, libellés génériques.
const fr = {
  appTagline: "Gestion des finances scolaires",
  logout: "Déconnexion",
  language: "Langue",
  roles: {
    owner: "Promoteur",
    accountant: "Comptable",
    controller: "Directeur / Préfet",
  },
  paymentMethods: {
    cash: "Espèces",
    bank: "Banque",
    mobile_money: "Mobile Money",
    other: "Autre",
  },
  print: "Imprimer / Enregistrer en PDF",
  loading: "Chargement…",
  back: "← Retour",
  none: "—",
  other: "Autre",
  school: "École",
  schools: "Écoles",
  allSchools: "Toutes les écoles",
  unconfigured: {
    title: "Compte non configuré",
    body: "Votre compte n'est rattaché à aucune organisation. Contactez l'administrateur ECOBU.",
  },
  signedBy: "Édité via GestiFinance",
};

export type CommonMessages = typeof fr;

const en: CommonMessages = {
  appTagline: "School finance management",
  logout: "Sign out",
  language: "Language",
  roles: {
    owner: "Owner",
    accountant: "Accountant",
    controller: "Head teacher",
  },
  paymentMethods: {
    cash: "Cash",
    bank: "Bank",
    mobile_money: "Mobile Money",
    other: "Other",
  },
  print: "Print / Save as PDF",
  loading: "Loading…",
  back: "← Back",
  none: "—",
  other: "Other",
  school: "School",
  schools: "Schools",
  allSchools: "All schools",
  unconfigured: {
    title: "Account not set up",
    body: "Your account is not linked to any organisation. Please contact the ECOBU administrator.",
  },
  signedBy: "Generated with GestiFinance",
};

const common = { fr, en };
export default common;
