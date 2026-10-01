// Textes de l'espace parent (page publique /parent) et de la carte
// « Accès parent » de la fiche élève (comptable).
const fr = {
  page: {
    title: "Espace parent",
    intro: "Consultez la situation des frais scolaires de votre enfant avec le code remis par l'école.",
    codeLabel: "Code d'accès",
    codePh: "Ex. 7K2QF-M9XRB",
    open: "Consulter",
    checking: "Vérification…",
    invalid: "Code introuvable. Vérifiez-le ou demandez un nouveau code à la comptabilité de l'école.",
    network: "Connexion impossible. Vérifiez votre accès à Internet et réessayez.",
    myChildren: "Mes enfants",
    addChild: "Ajouter un enfant",
    remove: "Retirer de cet appareil",
    removeConfirm: "Retirer cet enfant de ce téléphone ? Vous pourrez le rajouter avec son code.",
    revoked: "Ce code n'est plus valide (il a été changé ou désactivé par l'école).",
    inOrder: "● En ordre",
    notInOrder: "● Non en ordre",
    noFees: "Aucun frais n'est encore paramétré pour la classe de votre enfant.",
    noClass: "Sans classe",
    help: "Pour toute question sur un paiement, adressez-vous à la comptabilité de l'école.",
    privacy: "Les codes sont enregistrés uniquement sur ce téléphone.",
    staffLogin: "Personnel de l'école ? Se connecter",
  },
  card: {
    title: "Accès parent",
    desc: "Le parent consulte, sans compte, le statut et les frais de l'élève (sans l'historique détaillé).",
    none: "Aucun code pour cet élève.",
    generate: "Générer un code",
    regenerate: "Nouveau code",
    revoke: "Désactiver",
    copy: "Copier le lien",
    copied: "Lien copié",
    whatsapp: "Partager sur WhatsApp",
    whatsappText: (student: string, school: string, code: string, link: string) =>
      `${school} — Situation des frais de ${student}.\nCode d'accès : ${code}\n${link}`,
    confirmRegenerate: "Créer un nouveau code ? L'ancien ne fonctionnera plus.",
    confirmRevoke: "Désactiver l'accès parent pour cet élève ?",
    offline: "Disponible uniquement en ligne.",
    error: "Opération impossible. Réessayez.",
    since: (date: string) => `Créé le ${date}`,
  },
  login: {
    parentLink: "Vous êtes parent ? Consulter avec un code",
  },
};

export type ParentMessages = typeof fr;

const en: ParentMessages = {
  page: {
    title: "Parent portal",
    intro: "Check your child's school fees using the code provided by the school.",
    codeLabel: "Access code",
    codePh: "e.g. 7K2QF-M9XRB",
    open: "View",
    checking: "Checking…",
    invalid: "Code not found. Please check it or ask the school's accounts office for a new code.",
    network: "Unable to connect. Check your internet connection and try again.",
    myChildren: "My children",
    addChild: "Add a child",
    remove: "Remove from this device",
    removeConfirm: "Remove this child from this phone? You can add them again with their code.",
    revoked: "This code is no longer valid (it was changed or disabled by the school).",
    inOrder: "● Up to date",
    notInOrder: "● Not up to date",
    noFees: "No fees have been set up yet for your child's class.",
    noClass: "No class",
    help: "For any question about a payment, please contact the school's accounts office.",
    privacy: "Codes are stored only on this phone.",
    staffLogin: "School staff? Sign in",
  },
  card: {
    title: "Parent access",
    desc: "Parents can view, without an account, the student's status and fees (not the detailed history).",
    none: "No code for this student yet.",
    generate: "Generate a code",
    regenerate: "New code",
    revoke: "Disable",
    copy: "Copy link",
    copied: "Link copied",
    whatsapp: "Share on WhatsApp",
    whatsappText: (student: string, school: string, code: string, link: string) =>
      `${school} — School fees for ${student}.\nAccess code: ${code}\n${link}`,
    confirmRegenerate: "Create a new code? The old one will stop working.",
    confirmRevoke: "Disable parent access for this student?",
    offline: "Available online only.",
    error: "Something went wrong. Please try again.",
    since: (date: string) => `Created on ${date}`,
  },
  login: {
    parentLink: "Are you a parent? View with a code",
  },
};

const parent = { fr, en };
export default parent;
