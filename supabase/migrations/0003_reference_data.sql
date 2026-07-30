-- ============================================================
-- GestiFinance — 0003 : Données de référence (banques, frais)
-- ============================================================

-- ------------------------------------------------------------
-- banks
-- ------------------------------------------------------------
create table banks (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  school_id    uuid not null references schools(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz
);
create index idx_banks_school on banks (school_id);
create trigger trg_banks_updated before update on banks
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- fee_types : types de frais (minerval, inscription, examen…)
-- La devise est portée par le type de frais → évite d'additionner
-- des montants de devises différentes dans un même solde.
-- ------------------------------------------------------------
create table fee_types (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  school_id    uuid not null references schools(id) on delete cascade,
  name         text not null,
  currency     currency_code not null default 'CDF',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz
);
create index idx_fee_types_school on fee_types (school_id);
create trigger trg_fee_types_updated before update on fee_types
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- fee_schedules : montant attendu (par classe le cas échéant)
-- ------------------------------------------------------------
create table fee_schedules (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  school_id        uuid not null references schools(id) on delete cascade,
  fee_type_id      uuid not null references fee_types(id) on delete cascade,
  class_name       text,                          -- null = toutes les classes
  amount_expected  numeric(14,2) not null check (amount_expected >= 0),
  due_date         date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  synced_at        timestamptz
);
create index idx_fee_schedules_lookup on fee_schedules (school_id, fee_type_id);
create trigger trg_fee_schedules_updated before update on fee_schedules
  for each row execute function set_updated_at();
