# GestiFinance — Schéma de base de données

**Version :** 1.0
**SGBD :** PostgreSQL (Supabase)
**Principes :** Multi-tenant strict (RLS) · Paiements append-only · Journal auditable

---

## 1. Principes de conception

1. **Multi-tenant par `tenant_id`** — chaque client (promoteur/organisation) est un *tenant*.
   Aucune requête ne peut franchir la frontière d'un tenant (RLS).
2. **Append-only pour l'argent** — un paiement n'est **jamais** modifié ni supprimé.
   Une correction = un nouvel événement (`payment_events`).
3. **UUID générés côté client** — chaque enregistrement a un `id` UUID créé localement,
   ce qui permet de créer hors ligne sans collision et de synchroniser sans renuméroter.
4. **Colonnes de synchronisation** sur chaque table synchronisée :
   `created_at`, `updated_at`, `deleted_at` (soft delete), `synced_at`.

---

## 2. Modèle relationnel (vue d'ensemble)

```
tenants
  └── schools
        ├── users (via user_schools)         rôles: owner / accountant / controller
        ├── students
        │     └── payment_events  ────────────┐
        ├── fee_types                          │
        │     └── fee_schedules (attendu/classe)│
        └── banks                              │
                                               │
  payments (vue matérialisée / dérivée) ◄──────┘  (état courant reconstruit des events)
```

---

## 3. Tables

### 3.1 `tenants`
Le client (organisation propriétaire d'une ou plusieurs écoles). Racine du multi-tenant.

```sql
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- White-label (préparé, non activé au MVP)
  logo_url    text,
  primary_color text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

### 3.2 `schools`
```sql
create table schools (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  address     text,
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index on schools (tenant_id);
```

### 3.3 `users` & `user_schools`
`users` s'appuie sur `auth.users` de Supabase. On stocke le profil applicatif à part.

```sql
create type app_role as enum ('owner', 'accountant', 'controller');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  full_name   text,
  role        app_role not null,
  created_at  timestamptz not null default now()
);
create index on profiles (tenant_id);

-- Un comptable/directeur est rattaché à une ou plusieurs écoles.
-- Le owner voit toutes les écoles de son tenant (pas besoin de ligne ici).
create table user_schools (
  user_id     uuid not null references profiles(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  primary key (user_id, school_id)
);
```

### 3.4 `students`
```sql
create table students (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  matricule   text not null,
  first_name  text not null,
  last_name   text not null,
  class_name  text,          -- ex. "6ème"
  section     text,          -- ex. "Commerciale A"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  synced_at   timestamptz
);
create index on students (school_id);
-- Matricule unique par école
create unique index students_matricule_school
  on students (school_id, matricule) where deleted_at is null;
```

### 3.5 `banks`
```sql
create table banks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
```

### 3.6 `fee_types` & `fee_schedules`
Types de frais et montant attendu (par classe le cas échéant).

```sql
create table fee_types (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  name        text not null,             -- ex. "Minerval", "Inscription", "Examen"
  currency    text not null default 'CDF',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table fee_schedules (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  fee_type_id uuid not null references fee_types(id) on delete cascade,
  class_name  text,                       -- null = s'applique à toutes les classes
  amount_expected numeric(14,2) not null, -- montant total attendu
  due_date    date,
  created_at  timestamptz not null default now()
);
create index on fee_schedules (school_id, fee_type_id);
```

### 3.7 `payment_events` — **cœur append-only**
Chaque mouvement financier est un événement **immuable**. On n'UPDATE ni ne DELETE jamais.

```sql
create type payment_event_type as enum ('payment', 'cancellation');

create table payment_events (
  id            uuid primary key default gen_random_uuid(),   -- généré côté client
  tenant_id     uuid not null references tenants(id) on delete cascade,
  school_id     uuid not null references schools(id) on delete cascade,
  student_id    uuid not null references students(id),
  fee_type_id   uuid not null references fee_types(id),
  bank_id       uuid references banks(id),

  event_type    payment_event_type not null default 'payment',
  -- Pour une annulation : référence l'événement 'payment' annulé
  cancels_event_id uuid references payment_events(id),

  bordereau_no  text,                       -- numéro du bordereau bancaire
  amount        numeric(14,2) not null,     -- > 0 pour payment
  paid_at       date not null,              -- date figurant sur le bordereau
  note          text,

  -- Traçabilité
  created_by    uuid not null references profiles(id),
  authorized_by uuid references profiles(id),   -- promoteur, requis pour cancellation
  created_at    timestamptz not null default now(),
  synced_at     timestamptz
);

create index on payment_events (school_id, student_id);
create index on payment_events (school_id, paid_at);

-- GARDE-FOU ANTI-DOUBLON : un même numéro de bordereau ne peut exister
-- qu'une fois par école (uniquement pour les vrais paiements).
create unique index payment_bordereau_unique
  on payment_events (school_id, bordereau_no)
  where event_type = 'payment' and bordereau_no is not null;
```

> **Annulation :** on n'efface pas le paiement. On insère un événement
> `event_type = 'cancellation'`, `cancels_event_id = <id du paiement>`,
> `authorized_by = <owner>`. Le solde est recalculé en soustrayant les paiements annulés.

### 3.8 Vue de l'état courant des paiements

```sql
-- Paiements effectifs = payments non annulés
create view payments_effective as
select p.*
from payment_events p
where p.event_type = 'payment'
  and not exists (
    select 1 from payment_events c
    where c.event_type = 'cancellation'
      and c.cancels_event_id = p.id
  );
```

### 3.9 Solvabilité (calcul)

```sql
-- Total payé par élève et type de frais
create view student_paid as
select student_id, fee_type_id, sum(amount) as total_paid
from payments_effective
group by student_id, fee_type_id;

-- Statut de solvabilité : attendu vs payé
-- (jointure fee_schedules ↔ student_paid côté application ou vue enrichie)
```

---

## 4. Sécurité — Row Level Security (RLS)

Objectif : **isolation totale entre tenants** + restrictions par rôle.

### 4.1 Fonction utilitaire — tenant courant

```sql
create or replace function current_tenant_id()
returns uuid language sql stable as $$
  select tenant_id from profiles where id = auth.uid()
$$;

create or replace function current_role()
returns app_role language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

-- Écoles auxquelles l'utilisateur a accès
create or replace function has_school_access(target_school uuid)
returns boolean language sql stable as $$
  select
    -- Le owner voit toutes les écoles de son tenant
    exists (select 1 from profiles where id = auth.uid()
              and role = 'owner'
              and tenant_id = (select tenant_id from schools where id = target_school))
    or
    -- comptable/directeur : uniquement ses écoles rattachées
    exists (select 1 from user_schools where user_id = auth.uid() and school_id = target_school);
$$;
```

### 4.2 Exemple de politiques (à répliquer par table)

```sql
alter table students enable row level security;

-- Lecture : même tenant + accès à l'école
create policy students_select on students for select
  using (tenant_id = current_tenant_id() and has_school_access(school_id));

-- Écriture réservée aux comptables de l'école
create policy students_insert on students for insert
  with check (
    tenant_id = current_tenant_id()
    and has_school_access(school_id)
    and current_role() = 'accountant'
  );
```

### 4.3 Politique clé sur `payment_events`

```sql
alter table payment_events enable row level security;

-- Directeur : PEUT lire les events (pour calculer solvabilité) mais l'UI
--   ne lui affiche pas les montants. Option plus stricte : exposer au directeur
--   UNIQUEMENT une vue "solvabilité" (statut booléen) et refuser payment_events.
create policy pe_select on payment_events for select
  using (
    tenant_id = current_tenant_id()
    and has_school_access(school_id)
    and current_role() in ('owner', 'accountant')   -- directeur exclu ici
  );

-- Insertion d'un paiement : comptable uniquement
create policy pe_insert_payment on payment_events for insert
  with check (
    tenant_id = current_tenant_id()
    and has_school_access(school_id)
    and current_role() = 'accountant'
    and event_type = 'payment'
  );

-- Insertion d'une annulation : doit être autorisée par un owner
create policy pe_insert_cancel on payment_events for insert
  with check (
    tenant_id = current_tenant_id()
    and event_type = 'cancellation'
    and authorized_by is not null
    and exists (select 1 from profiles where id = authorized_by and role = 'owner')
  );

-- Aucune UPDATE / DELETE autorisée (append-only) → pas de policy = refus par défaut.
```

> **Vue directeur :** créer une vue `student_solvency_status(student_id, school_id, is_in_order boolean)`
> exposée au rôle `controller` **sans aucun montant**, et refuser l'accès direct à `payment_events`.

---

## 5. Correspondance table locale (Dexie / IndexedDB)

Le schéma local reflète le schéma cloud, avec un flag de synchronisation.

```js
// db.js (Dexie)
db.version(1).stores({
  schools:        'id, tenant_id, _dirty',
  students:       'id, school_id, matricule, _dirty',
  banks:          'id, school_id, _dirty',
  fee_types:      'id, school_id, _dirty',
  fee_schedules:  'id, school_id, fee_type_id, _dirty',
  payment_events: 'id, school_id, student_id, bordereau_no, _dirty',
  sync_queue:     '++seq, entity, entity_id, op, created_at'
});
// _dirty = 1 tant que non synchronisé ; sync_queue = journal d'opérations à pousser.
```

Détails du moteur de synchronisation : voir **doc 03 — Stratégie de synchronisation**.

---

## 6. Ordre de création (migrations)

1. `tenants`
2. `schools`
3. `profiles`, `user_schools`
4. `banks`, `fee_types`, `fee_schedules`
5. `students`
6. `payment_events` + index unicité bordereau
7. Vues (`payments_effective`, `student_paid`, `student_solvency_status`)
8. Fonctions RLS + activation RLS + policies sur chaque table
