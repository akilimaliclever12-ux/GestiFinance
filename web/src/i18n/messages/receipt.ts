// Textes de la zone « receipt ». Toute clé ajoutée à fr doit l'être à en (vérifié par TypeScript).
const fr = {
  notFound: "Reçu introuvable ou accès non autorisé.",
  backToPayments: "← Retour aux paiements",
  title: "REÇU DE PAIEMENT",
  number: (n: string) => `N° ${n}`,
  student: "Élève",
  matricule: "Matricule",
  className: "Classe",
  paidAt: "Date de paiement",
  feeType: "Type de frais",
  bank: "Banque",
  bordereau: "N° bordereau",
  note: "Note",
  amountPaid: "Montant payé",
  signature: "Signature du comptable",
  issuedBy: "Émis via GestiFinance",
  qrSoon: "Vérification QR — à venir",
};

export type ReceiptMessages = typeof fr;

const en: ReceiptMessages = {
  notFound: "Receipt not found or access denied.",
  backToPayments: "← Back to payments",
  title: "PAYMENT RECEIPT",
  number: (n: string) => `No. ${n}`,
  student: "Student",
  matricule: "Student ID",
  className: "Class",
  paidAt: "Payment date",
  feeType: "Fee type",
  bank: "Bank",
  bordereau: "Bank slip no.",
  note: "Note",
  amountPaid: "Amount paid",
  signature: "Accountant's signature",
  issuedBy: "Issued with GestiFinance",
  qrSoon: "QR verification — coming soon",
};

const receipt = { fr, en };
export default receipt;
