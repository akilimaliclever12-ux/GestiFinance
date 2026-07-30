# GestiFinance — Stratégie de synchronisation Offline-First

**Version :** 1.0
**Le document le plus critique du projet.**
Principe directeur : *le cloud ne doit JAMAIS empêcher le logiciel de fonctionner.*

---

## 1. Décision fondamentale : LWW + journal, pas de CRDT

| Approche | Verdict | Raison |
|----------|---------|--------|
| **CRDT** | ❌ Rejeté | Résout l'édition concurrente du *même champ*. Or nos paiements sont des **événements append-only** — ce cas n'existe quasiment pas. Complexité injustifiée. |
| **Last-Write-Wins (LWW)** | ✅ Retenu | Simple, suffisant pour les données mutables (élèves, frais). |
| **Journal d'événements append-only** | ✅ Retenu | Pour l'argent (paiements). Pas de conflit possible : on n'ajoute que des lignes. |

**Règle d'or :** on **crée** beaucoup, on **modifie** peu, on **supprime** presque jamais.
Cela élimine 95 % des conflits de synchronisation.

---

## 2. Modèle mental

Chaque appareil possède une **copie locale complète** (IndexedDB). La source de
vérité finale est le cloud (Supabase), mais **seulement une fois la synchro faite**.

```
┌─────────────┐   push (queue)     ┌──────────────┐
│  Appareil A │ ─────────────────► │              │
│ (comptable) │ ◄───────────────── │   Supabase   │
└─────────────┘   pull (delta)     │  (Postgres)  │
                                   │              │
┌─────────────┐                    │              │
│  Appareil B │ ◄────────────────► │              │
│ (promoteur) │   pull seulement   └──────────────┘
└─────────────┘
```

- **Comptable** : lecture + écriture (push & pull).
- **Promoteur / Directeur** : essentiellement lecture (pull) → moins de risques de conflit.

---

## 3. Identifiants & horodatage

1. **UUID côté client** : chaque enregistrement reçoit son `id` (UUID v4) au moment
   de la création locale, hors ligne. → Pas de renumérotation à la synchro, pas de collision.
2. **`updated_at`** : timestamp de dernière modification (pour l'arbitrage LWW).
3. **`created_at`** : immuable.
4. **`synced_at`** : null tant que non poussé vers le cloud.
5. **`_dirty`** (local uniquement) : `1` si l'enregistrement attend une synchro.

> ⚠️ **Horloge** : ne pas se fier aveuglément à l'horloge de l'appareil (peut être fausse).
> Pour l'arbitrage final, le serveur **estampille** `server_updated_at` à la réception.
> LWW se base sur `server_updated_at` en priorité, `updated_at` client en secours.

---

## 4. La file de synchronisation (`sync_queue`)

Toute opération locale génère une entrée dans une **file ordonnée** :

```js
// Entrée de sync_queue
{
  seq: 42,                 // auto-incrément local → ordre garanti
  entity: 'payment_events',
  entity_id: '<uuid>',
  op: 'insert',            // insert | update | soft_delete
  payload: { ... },        // données à pousser
  created_at: '2026-07-29T10:12:00Z',
  attempts: 0
}
```

- La file est **rejouée dans l'ordre** (`seq` croissant).
- Une opération réussie → retirée de la file, `_dirty = 0`, `synced_at` renseigné.
- Une opération échouée → `attempts++`, backoff exponentiel, on continue plus tard.

---

## 5. Cycle de synchronisation

Déclencheurs : (a) retour de connexion (`navigator.onLine` + ping réel),
(b) minuterie (ex. toutes les 30 s si en ligne), (c) action manuelle « Synchroniser ».

```
SYNC():
  1. Vérifier connexion réelle (ping léger /health, pas seulement navigator.onLine)
  2. PUSH  — vider sync_queue vers Supabase (dans l'ordre seq)
  3. PULL  — récupérer les changements distants depuis last_pulled_at
  4. MERGE — appliquer localement avec règles de résolution
  5. Mettre à jour last_pulled_at = server_time renvoyé
```

### 5.1 PUSH (local → cloud)

```
Pour chaque entrée de la queue (ordre seq) :
  - insert payment_events → INSERT ; si conflit d'unicité bordereau → voir §6.2
  - insert/update students → UPSERT (on conflict id do update ... where LWW gagne)
  - soft_delete → UPDATE deleted_at
  Marquer synced_at, _dirty=0, retirer de la queue.
```

### 5.2 PULL (cloud → local, delta uniquement)

On ne télécharge que ce qui a changé depuis la dernière synchro :

```sql
select * from students
where tenant_id = :tenant
  and school_id = any(:my_schools)
  and server_updated_at > :last_pulled_at
order by server_updated_at asc;
```

> Optimisation : Supabase Realtime peut pousser les deltas en temps réel quand
> l'appareil est en ligne (utile surtout pour le dashboard promoteur).

---

## 6. Résolution des conflits

### 6.1 Données mutables (élèves, frais, banques) → **LWW**

```
Si version locale ET version distante modifiées :
  garder celle dont server_updated_at (sinon updated_at) est la PLUS RÉCENTE.
```

Le conflit réel est rare (deux personnes éditant le même élève hors ligne au même moment).
Acceptable pour ce domaine.

### 6.2 Paiements (append-only) → **pas de conflit, sauf doublon de bordereau**

Comme on n'ajoute que des lignes avec UUID uniques, **il n'y a jamais de conflit de fusion**.
Le seul cas à gérer : **deux appareils enregistrent le même numéro de bordereau**
(ex. deux comptables saisissent le même bordereau papier).

```
PUSH d'un payment_events échoue sur la contrainte unique (school_id, bordereau_no) :
  → NE PAS écraser. C'est un doublon métier légitime à signaler.
  → Marquer l'événement local comme 'conflit_doublon'.
  → Notifier le comptable : « Le bordereau n°X existe déjà (saisi le … par …). »
  → L'utilisateur décide : abandonner sa saisie OU corriger le numéro.
```

C'est **exactement le garde-fou anti-fraude/anti-doublon voulu** : la contrainte
d'unicité transforme un conflit technique en contrôle métier utile.

### 6.3 Annulations
Une annulation est un simple `insert` (event_type = 'cancellation'). Aucun conflit :
elle référence l'`id` du paiement. Si le paiement n'est pas encore synchronisé sur
l'autre appareil, l'annulation arrivera après (ordre `seq` + `created_at`) et sera cohérente.

---

## 7. Cas limites à couvrir

| Cas | Traitement |
|-----|-----------|
| Coupure réseau en plein PUSH | Idempotence : re-PUSH d'un `insert` déjà passé = UPSERT sur `id` → aucun doublon. |
| Horloge appareil fausse | Serveur estampille `server_updated_at` à la réception ; arbitrage LWW dessus. |
| Même bordereau, 2 appareils | Contrainte unique → signalé comme doublon métier (§6.2). |
| Appareil hors ligne plusieurs jours | PULL par delta rattrape tout ; file locale rejouée dans l'ordre. |
| Suppression pendant qu'un autre édite | Soft delete gagne si `deleted_at` > `updated_at` distant ; sinon LWW. |
| Base locale corrompue | Cloud = source de vérité une fois synchro ; re-hydratation complète possible. |
| Élève créé offline puis payé offline | Les deux ont des UUID ; PUSH dans l'ordre `seq` (élève avant paiement) → FK OK. |

> **Ordre des dépendances au PUSH** : toujours pousser dans l'ordre
> `tenants → schools → students/fee_types/banks → payment_events`
> pour respecter les clés étrangères. La file `seq` le garantit naturellement si
> l'app crée toujours le parent avant l'enfant.

---

## 8. Idempotence (règle non négociable)

Tout PUSH doit pouvoir être **rejoué sans effet de bord** :

```sql
-- Insertion de paiement idempotente
insert into payment_events (id, ...) values (:id, ...)
on conflict (id) do nothing;   -- déjà reçu = on ignore

-- Upsert élève idempotent avec LWW
insert into students (id, ..., updated_at) values (:id, ..., :updated_at)
on conflict (id) do update
  set ... , updated_at = excluded.updated_at
  where excluded.updated_at > students.updated_at;   -- LWW
```

Cela protège contre les doubles envois dus aux coupures réseau.

---

## 9. Indicateurs UI (confiance de l'utilisateur)

L'utilisateur doit **toujours** savoir où en est la synchro :

- Badge global : `🟢 En ligne` / `🔴 Hors ligne` / `🟡 3 en attente`.
- Sur chaque paiement récent : `✓ synchronisé` / `⏳ en attente` / `⚠️ doublon détecté`.
- Bouton « Synchroniser maintenant » (rassure, même si l'auto-sync tourne).
- Jamais de blocage : une saisie hors ligne est **immédiatement** valide localement.

---

## 10. Sécurité de la synchro

- Toutes les requêtes passent par **Supabase Auth (JWT)** ; RLS filtre par tenant/école.
- Un appareil ne peut PULL/PUSH que les écoles auxquelles son utilisateur a accès.
- Le token expiré hors ligne : l'app continue à fonctionner en local ; au retour,
  refresh du token puis synchro.
- Les données locales sensibles (IndexedDB) : envisager un chiffrement léger si
  l'appareil est partagé (v1.1).

---

## 11. Séquence de mise en œuvre (Phase P3)

1. Mettre en place Dexie + schéma local (doc 02 §5).
2. Intercepter toutes les écritures → écrire en local + pousser dans `sync_queue`.
3. Implémenter `SYNC()` : PUSH (queue) puis PULL (delta) avec `last_pulled_at`.
4. Rendre les UPSERT idempotents côté Supabase (RPC ou policies + `on conflict`).
5. Gérer le cas doublon-bordereau (§6.2) avec notification comptable.
6. Ajouter les indicateurs UI (§9).
7. Tester les cas limites (§7) hors ligne réel (couper le Wi-Fi, avion, etc.).

---

## 12. Résumé en une phrase

> **On travaille toujours en local ; on synchronise des événements idempotents dans
> l'ordre ; on résout les rares conflits par Last-Write-Wins ; et l'unicité du
> bordereau transforme le seul vrai conflit métier en garde-fou anti-fraude.**
