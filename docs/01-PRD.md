# GestiFinance — PRD (Product Requirements Document)

**Version :** 1.0 (MVP)
**Date :** 2026-07-29
**Statut :** À valider

---

## 1. Résumé exécutif

GestiFinance est un logiciel **spécialisé dans la gestion des finances scolaires**,
conçu **Offline-First** pour les écoles de RDC où la connexion Internet est limitée
ou intermittente.

Il ne remplace pas GestiEcole. Il répond à un problème précis :

> « Comment contrôler efficacement les recettes scolaires et l'état de solvabilité
> des élèves, même sans Internet ? »

**Client type du MVP :** un promoteur possédant 2 écoles, avec un comptable par école.

---

## 2. Problème & workflow actuel

| Étape | Acteur | Problème |
|-------|--------|----------|
| 1. Paiement à la banque | Parent | — |
| 2. Remise du bordereau | Banque | Papier, perte possible |
| 3. Transport du bordereau | Élève | Délai |
| 4. Enregistrement | Comptable | **Manuel, source d'erreurs et de retards** |
| 5. Reçu (optionnel) | Comptable | Souvent absent |
| 6. Contrôle solvabilité | École | **L'élève est « non solvable » tant que le bordereau n'est pas saisi, même s'il a payé** |

**Douleur centrale :** le décalage entre *paiement effectué* et *paiement enregistré*,
aggravé par l'absence d'Internet fiable.

---

## 3. Objectifs du MVP

1. Permettre au comptable d'**enregistrer un paiement en < 30 secondes**, même hors ligne.
2. Donner au promoteur une **vue mobile temps réel** (dès qu'il y a du réseau) des recettes.
3. Fournir au directeur/préfet un **statut solvable / non solvable** sans exposer les montants.
4. Garantir que le logiciel **fonctionne à 100 % sans Internet** et **synchronise seul** au retour du réseau.

### Non-objectifs (hors MVP)

- Mobile Money / intégration bancaire directe
- Scan automatique de bordereaux (OCR)
- WhatsApp / SMS automatiques
- White-label complet, domaines personnalisés
- Application desktop Electron
- API publique

---

## 4. Personas & rôles (RBAC)

### 4.1 Promoteur (Owner)
- Voit **toutes ses écoles** (dashboard consolidé).
- Recettes du jour / semaine / mois / année.
- Statistiques par école, par banque, par type de frais.
- Historique complet, notifications.
- **Ne saisit pas** de paiements (rôle de supervision).
- **Autorise** les annulations de paiement.

### 4.2 Comptable (Accountant) — un par école
- Enregistre / importe les élèves.
- Enregistre les paiements (bordereau, banque, date, montant, type de frais).
- Génère et imprime les reçus PDF.
- Demande l'annulation d'un paiement (soumise à autorisation promoteur).
- Recherche un élève, consulte l'historique de son école.
- **Ne voit que les données de son école.**

### 4.3 Directeur / Préfet (Controller)
- Voit **uniquement** : élève « en ordre » / « non en ordre ».
- **Ne voit jamais les montants.**
- Objectif : contrôler l'accès aux cours ou aux examens.

| Capacité | Promoteur | Comptable | Directeur |
|----------|:---------:|:---------:|:---------:|
| Voir montants / recettes | ✅ | ✅ (son école) | ❌ |
| Enregistrer paiement | ❌ | ✅ | ❌ |
| Enregistrer élève | ❌ | ✅ | ❌ |
| Autoriser annulation | ✅ | ❌ | ❌ |
| Voir statut solvabilité | ✅ | ✅ | ✅ |
| Multi-écoles | ✅ | ❌ | ❌ |

---

## 5. Fonctionnalités MVP

### 5.1 Élèves
- Création manuelle (nom, matricule, classe, section).
- Import Excel / CSV (colonnes : matricule, nom, prénom, classe, section).
- Recherche rapide (nom ou matricule).
- Fiche élève : historique des paiements, solde restant, statut.

### 5.2 Frais scolaires (paramétrage)
- Définition des **types de frais** par école (ex. minerval, inscription, examen).
- Montant attendu par type / par classe.
- Possibilité de tranches (échéances).

### 5.3 Paiements
- Champs : **numéro de bordereau** (unique/école), banque, date, montant, type de frais, élève.
- **Modèle append-only** : un paiement ne se modifie pas ; une annulation crée un événement d'annulation.
- Validation côté client (montant > 0, bordereau non vide).
- **Contrainte d'unicité du numéro de bordereau par école** (garde-fou anti-doublon / anti-fraude).

### 5.4 Reçus
- Génération PDF (logo école, élève, montant, bordereau, date, signature comptable).
- Impression.
- QR code de vérification *(préparé dans le modèle, activé en v1.1)*.

### 5.5 Solvabilité
- Calcul automatique : `total attendu − total payé` par élève.
- Statut : **En ordre** (solde ≤ 0) / **Non en ordre** (solde > 0).
- Vue filtrable par classe / section pour le directeur.

### 5.6 Dashboard promoteur
- Recettes : aujourd'hui, cette semaine, ce mois, cette année.
- Nombre d'élèves solvables / non solvables.
- Paiements en attente de synchronisation (indicateur).
- Répartition par école et par banque.

### 5.7 Rapports
- Recettes par école, par période, par banque, par type de frais.
- Export PDF / Excel.
- Historique complet (journal d'événements).

### 5.8 Offline & synchronisation
- Toute opération enregistrée **localement d'abord** (IndexedDB).
- Indicateur visuel de l'état : `en ligne` / `hors ligne` / `X éléments à synchroniser`.
- Synchronisation **automatique** au retour du réseau (voir doc 03).
- Aucune opération bloquée par l'absence de cloud.

---

## 6. Contraintes non fonctionnelles

| Contrainte | Cible |
|-----------|-------|
| Offline | 100 % des opérations disponibles sans réseau |
| Performance | Enregistrement d'un paiement < 1 s (local) |
| Multi-plateforme | PWA installable (téléphone + PC), navigateur moderne |
| Sécurité | Auth JWT (Supabase), RBAC, isolation multi-tenant (RLS) |
| Multi-tenant | Aucune donnée partagée entre clients |
| Auditabilité | Journal append-only de tous les mouvements financiers |
| Simplicité | Un comptable non technicien doit être opérationnel en < 30 min |

---

## 7. Stack technique retenue

- **Frontend :** Next.js (PWA) + React
- **Base locale :** IndexedDB via **Dexie.js**
- **Cloud :** Supabase (PostgreSQL + Auth + RLS)
- **Sync :** push d'événements, **Last-Write-Wins + journal append-only** (voir doc 03)
- **PDF :** génération côté client (react-pdf ou équivalent)
- **Auth :** Supabase Auth (JWT) + rôles RBAC

> Cohérent avec Fundi Bukavu, Maarifa et TSFEV — réutilisation du savoir-faire Supabase.

---

## 8. Découpage en phases

| Phase | Contenu | Livrable |
|-------|---------|----------|
| **P0** | Schéma BD + Auth + multi-tenant RLS | Base cloud + login par rôle |
| **P1** | Élèves (CRUD + import Excel) + frais | Gestion des élèves offline |
| **P2** | Paiements (append-only) + reçus PDF | Cœur métier |
| **P3** | Moteur de sync offline (Dexie ↔ Supabase) | Fonctionnement hors ligne réel |
| **P4** | Dashboard promoteur + solvabilité | Vue promoteur mobile |
| **P5** | Rapports + exports | Reporting |
| **P6** | Vue directeur (statut sans montants) | Contrôle d'accès examens |

---

## 9. Évolutions futures (post-MVP)

Scan QR reçus → scan OCR bordereaux → WhatsApp/SMS auto → Mobile Money →
intégration banque → signature électronique → white-label complet → API publique →
application desktop Electron.

---

## 10. Risques & mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Complexité de la sync offline | Élevé | LWW + append-only (pas de CRDT). Voir doc 03. |
| Fraude / doublons de bordereau | Élevé | Unicité bordereau/école + journal auditable |
| Conflits de données | Moyen | Événements append-only, quasi pas de conflit réel |
| Adoption comptable | Moyen | UX ultra-simple, formation < 30 min |
| Corruption base locale | Moyen | Sync fréquente, source de vérité = cloud une fois synchronisé |
