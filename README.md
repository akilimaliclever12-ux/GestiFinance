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
| P3b | Sync offline des données (Dexie ↔ Supabase) | À venir |
| **P4** | Dashboard promoteur : recettes par devise (jour/mois/année) + solvables/non-solvables en temps réel | ✅ Fait |
| P5 | Rapports + exports | À venir |
| P6 | Vue directeur (statut sans montants) | Ébauche (P0) |

## Structure

```
GestiFinance/
├── docs/                  Documents fondateurs (PRD, schéma, sync)
├── supabase/
│   ├── migrations/        8 migrations SQL (schéma + RLS)
│   └── seed.sql           Tenant pilote « ECOBU »
└── web/                   Application Next.js 16 (App Router, PWA à venir)
```

## Mise en route (P0)

### 1. Créer le projet Supabase
- Créez un projet sur [supabase.com](https://supabase.com).
- Dans le **SQL Editor**, exécutez dans l'ordre les fichiers de
  `supabase/migrations/` (0001 → 0008), puis `supabase/seed.sql`.

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

Reprend le logo et les couleurs de **GestiEcole** (drapeau RDC) :
bleu `#1668e3` (principal), jaune `#f7c21b` (étoile), rouge `#ea3324` (accent).
Le logo est dans `web/public/logo.png` ; les couleurs sont définies dans
`web/src/app/globals.css` (`@theme`, classes `bg-brand`, `text-brand`…).
> Note : le logo actuel porte le libellé « GestiEcole » (marque famille). Un
> variant « GestiFinance » pourra le remplacer sans changer le code (même fichier).

## Stack

Next.js 16 · React 19 · Tailwind 4 · Supabase (Postgres + Auth + RLS) ·
xlsx/SheetJS (import Excel) · Dexie/IndexedDB (offline, à partir de P3).
