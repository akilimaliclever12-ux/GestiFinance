// Textes de la zone « controller ». Toute clé ajoutée à fr doit l'être à en (vérifié par TypeScript).
const fr = {
  title: "Contrôle de solvabilité",
  intro: "Statut des élèves pour l'accès aux cours et aux examens, selon les frais déjà échus — sans aucun montant.",
  noClass: "Sans classe",
  noSection: "Sans section",
  filters: {
    className: "Classe",
    allClasses: "Toutes les classes",
    section: "Section",
    allSections: "Toutes les sections",
    status: "Statut",
    all: "Tous",
    search: "Recherche",
    searchPlaceholder: "Nom ou matricule",
    show: "Afficher",
    printList: "Imprimer la liste",
  },
  stats: {
    students: "Élèves",
  },
  inOrder: "En ordre",
  notInOrder: "Non en ordre",
  summary: {
    className: "Classe",
    headcount: "Effectif",
  },
  print: {
    titleKo: "LISTE DES ÉLÈVES NON EN ORDRE",
    titleOk: "LISTE DES ÉLÈVES EN ORDRE",
    titleAll: "STATUT DE SOLVABILITÉ DES ÉLÈVES",
    asOf: (date: string, n: number) => ` — situation au ${date} — ${n} élève(s)`,
    signature: "Le Directeur / Préfet",
  },
  table: {
    matricule: "Matricule",
    name: "Nom",
    className: "Classe",
    status: "Statut",
  },
  empty: {
    noStudents: "Aucun élève enregistré pour cette école.",
    noMatch: "Aucun élève ne correspond à ces critères.",
  },
};

export type ControllerMessages = typeof fr;

const en: ControllerMessages = {
  title: "Fee status check",
  intro: "Students' status for access to classes and exams, based on fees already due — no amounts shown.",
  noClass: "No class",
  noSection: "No section",
  filters: {
    className: "Class",
    allClasses: "All classes",
    section: "Section",
    allSections: "All sections",
    status: "Status",
    all: "All",
    search: "Search",
    searchPlaceholder: "Name or student ID",
    show: "Show",
    printList: "Print list",
  },
  stats: {
    students: "Students",
  },
  inOrder: "Up to date",
  notInOrder: "Not up to date",
  summary: {
    className: "Class",
    headcount: "Students",
  },
  print: {
    titleKo: "STUDENTS NOT UP TO DATE",
    titleOk: "STUDENTS UP TO DATE",
    titleAll: "STUDENT FEE STATUS",
    asOf: (date: string, n: number) => ` — status as of ${date} — ${n} student${n === 1 ? "" : "s"}`,
    signature: "The Head teacher",
  },
  table: {
    matricule: "Student ID",
    name: "Name",
    className: "Class",
    status: "Status",
  },
  empty: {
    noStudents: "No students registered for this school.",
    noMatch: "No students match these criteria.",
  },
};

const controller = { fr, en };
export default controller;
