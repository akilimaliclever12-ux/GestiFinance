# GestiFinance

Logiciel de **gestion des finances scolaires**, Offline-First, pour les écoles de RDC
(et écoles congolaises au Burundi). Multi-tenant, multi-devises (CDF / USD / BIF).

> Voir la vision et l'architecture dans [`docs/`](docs/) :
> [01-PRD](docs/01-PRD.md) · [02-DATABASE](docs/02-DATABASE.md) · [03-SYNC-STRATEGY](docs/03-SYNC-STRATEGY.md)

## État d'avancement

| Phase | Contenu | Statut |
|-------|---------|--------|
| **P0** | Schéma BD + Auth + RLS multi-tenant + login par rôle | ✅ Fait |
| **P1** | Élèves (création + import Excel/CSV + recherche) + frais (types + barèmes multi-devises) | ✅ Fait |
| **P2** | Paiements append-only (saisie bordereau + solvabilité live) + reçu imprimable + annulation autorisée | ✅ Fait |
| **P3a** | PWA installable + shell mis en cache (s'ouvre hors-ligne) | ✅ Fait |
| **P3b** | Offline-first des données : base locale Dexie + file de synchro (outbox) + saisie hors-ligne (Élèves, Paiements avec solvabilité locale, Dépenses) + indicateur de synchro | ✅ Fait |
| **P6** | Historique unifié des actions (recettes + dépenses) avec annulation non destructive + motif ; gestion des comptables par le promoteur (création de comptes + rattachement écoles) | ✅ Fait |
| **P4** | Dashboard promoteur : recettes par devise (jour/mois/année) + solvables/non-solvables en temps réel | ✅ Fait |
| **P5** | Dépenses (livre de caisse) : catégories + sorties append-only + annulation autorisée ; dashboard Recettes/Dépenses/**Solde net** par devise | ✅ Fait |
| **P5** | Rapports imprimables (en-tête d'école) + export **Excel** (synthèse + détail des opérations) et **PDF** (synthèse + annexes), générés dans le navigateur | ✅ Fait |
| **P6** | Vue directeur : statut en ordre / non en ordre **sans montants**, synthèse par classe, filtres (classe, statut, recherche), liste imprimable avec en-tête d'école | ✅ Fait |

## Espace parent

Page publique **`/parent`** : le parent consulte, **sans compte**, la situation
de son enfant (statut en ordre / non en ordre, frais par type, payé, reste,
tranches et prochaine échéance — pas d'historique détaillé).
- Le comptable génère un **code d'accès** depuis la fiche élève (carte « Accès
  parent ») : copier le lien, partager sur WhatsApp, régénérer, désactiver.
- Codes `XXXXX-XXXXX` (≈ 10^15 combinaisons, sans 0/O ni 1/I), un par élève.
- Le parent peut suivre plusieurs enfants ; les codes restent sur son téléphone.
- Côté base (migration 0017) : table `parent_access_codes` réservée au
  promoteur/comptable (RLS) et fonction `parent_statement(code)` qui ne renvoie
  que l'élève correspondant au code.

## Langues (FR / EN)

L'interface et les documents (reçus, rapports PDF/Excel, listes imprimées) sont
disponibles en **français** (par défaut) et en **anglais**. Bouton FR/EN dans
l'en-tête et sur les pages de connexion/inscription ; le choix est mémorisé dans
le cookie `lang`. Les textes sont dans `web/src/i18n/messages/` (un fichier par
zone) ; TypeScript vérifie que chaque texte français a son équivalent anglais.

## Structure

```
GestiFinance/
├── docs/                  Documents fondateurs (PRD, schéma, sync)
├── supabase/
│   ├── migrations/        17 migrations SQL (schéma + RLS)
│   └── seed.sql           Tenant pilote « ECOBU »
└── web/                   Application Next.js 16 (App Router, PWA à venir)
```

## Mise en route (P0)

### 1. Créer le projet Supabase
- Créez un projet sur [supabase.com](https://supabase.com).
- Dans le **SQL Editor**, exécutez dans l'ordre les fichiers de
  `supabase/migrations/` (0001 → 0017), puis `supabase/seed.sql`.

### 2. Créer le compte propriétaire ECOBU
- Dashboard Supabase > **Authentication > Users > Add user** (email + mot de passe).
- Copiez l'`UID` de l'utilisateur créé.
- Dans le SQL Editor, exécutez le bloc commenté en bas de `seed.sql` en
  remplaçant `<AUTH_USER_ID>` par cet UID → l'utilisateur devient `owner` d'ECOBU.

### 3. Configurer l'app web
```bash
cd web
cp .env.local.example .env.local   # renseignez URL + clé anon (Settings > API)
npm install
npm run dev
```
Ouvrez http://localhost:3000 (ou 3300 selon la config de lancement).

### 4. Rôles
Après connexion, l'utilisateur est redirigé selon son rôle :
- `owner` → `/owner` (tableau de bord promoteur, toutes les écoles)
- `accountant` → `/accountant` (saisie élèves / paiements)
- `controller` → `/controller` (statut de solvabilité, **sans montants**)

Le cloisonnement est appliqué à deux niveaux :
- **Middleware Next.js** : redirige hors de la zone d'un autre rôle.
- **RLS PostgreSQL** : le directeur ne peut techniquement pas lire les montants.

## Sécurité — points clés

- Isolation **multi-tenant stricte** via RLS (`current_tenant_id()`).
- Paiements **append-only** : jamais modifiés/supprimés (trigger + absence de policy).
- **Unicité du numéro de bordereau par école** : garde-fou anti-doublon / anti-fraude.
- Le rôle `controller` (directeur) n'a **aucun accès** à `payment_events` ; il ne voit
  que la vue `student_solvency_status` (booléens, sans aucun montant).

## Identité visuelle

Logo **GestiFinance** (emblème « GF », livre ouvert, étoile) aux couleurs de la
famille GestiEcole (drapeau RDC) : bleu `#1668e3` (principal), jaune `#f7c21b`
(étoile), rouge `#ea3324` (accent).
Le logo est dans `web/public/logo.png` ; les icônes PWA (`icon-192.png`,
`icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`) reprennent
l'emblème seul. Les couleurs sont définies dans `web/src/app/globals.css`
(`@theme`, classes `bg-brand`, `text-brand`…).

## Stack

Next.js 16 · React 19 · Tailwind 4 · Supabase (Postgres + Auth + RLS) ·
xlsx/SheetJS (import Excel) · Dexie/IndexedDB (offline, à partir de P3).
