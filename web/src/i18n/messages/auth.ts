// Textes de la zone « auth ». Toute clé ajoutée à fr doit l'être à en (vérifié par TypeScript).
const fr = {
  login: {
    email: "Email",
    password: "Mot de passe",
    submit: "Se connecter",
    submitting: "Connexion…",
    noSpace: "Pas encore d'espace ?",
    createSpace: "Créer un espace",
    errors: {
      required: "Email et mot de passe requis.",
      invalid: "Identifiants invalides.",
    },
  },
  signup: {
    title: "Créer votre espace",
    subtitle: "Votre organisation, vos écoles, vos données — isolées et à vous seul.",
    fullName: "Votre nom",
    org: "Nom de l'espace",
    orgPlaceholder: "Ex. Complexe ECOBU",
    email: "Email",
    password: "Mot de passe",
    currency: "Devise principale",
    submit: "Créer mon espace",
    submitting: "Création…",
    haveSpace: "Vous avez déjà un espace ?",
    login: "Se connecter",
    errors: {
      required: "Nom, espace et email sont obligatoires.",
      invalidEmail: "Email invalide.",
      passwordTooShort: "Le mot de passe doit faire au moins 6 caractères.",
      accountFailed: "Création du compte impossible.",
      emailExists: (email: string) => `Un compte existe déjà avec l'email ${email}.`,
      tenant: (msg: string | null) => `Espace : ${msg ?? "création impossible"}`,
      profile: (msg: string) => `Profil : ${msg}`,
    },
  },
  components: {
    sync: {
      offline: "Hors-ligne",
      syncing: "Synchro…",
      pending: (n: number) => `${n} en attente`,
      upToDate: "À jour",
      clickToSync: "Cliquer pour synchroniser",
      offlineHint: "Hors-ligne : les saisies seront envoyées au retour du réseau",
    },
    letterhead: {
      bp: "B.P.",
      tel: "Tél :",
    },
  },
};

export type AuthMessages = typeof fr;

const en: AuthMessages = {
  login: {
    email: "Email",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    noSpace: "Don't have a workspace yet?",
    createSpace: "Create a workspace",
    errors: {
      required: "Email and password are required.",
      invalid: "Invalid credentials.",
    },
  },
  signup: {
    title: "Create your workspace",
    subtitle: "Your organisation, your schools, your data — isolated and yours alone.",
    fullName: "Your name",
    org: "Workspace name",
    orgPlaceholder: "e.g. ECOBU Complex",
    email: "Email",
    password: "Password",
    currency: "Main currency",
    submit: "Create my workspace",
    submitting: "Creating…",
    haveSpace: "Already have a workspace?",
    login: "Sign in",
    errors: {
      required: "Name, workspace and email are required.",
      invalidEmail: "Invalid email.",
      passwordTooShort: "Password must be at least 6 characters long.",
      accountFailed: "Unable to create the account.",
      emailExists: (email: string) => `An account already exists with the email ${email}.`,
      tenant: (msg: string | null) => `Workspace: ${msg ?? "creation failed"}`,
      profile: (msg: string) => `Profile: ${msg}`,
    },
  },
  components: {
    sync: {
      offline: "Offline",
      syncing: "Syncing…",
      pending: (n: number) => `${n} pending`,
      upToDate: "Up to date",
      clickToSync: "Click to sync",
      offlineHint: "Offline: entries will be sent when the connection is back",
    },
    letterhead: {
      bp: "P.O. Box",
      tel: "Tel:",
    },
  },
};

const auth = { fr, en };
export default auth;
