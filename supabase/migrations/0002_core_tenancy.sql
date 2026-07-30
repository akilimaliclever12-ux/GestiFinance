-- ============================================================
-- GestiFinance — 0002 : Multi-tenant (tenants, écoles, profils)
-- ============================================================

-- ------------------------------------------------------------
-- tenants : le client (organisation propriétaire d'écoles)
-- ------------------------------------------------------------
create table tenants (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  -- White-label (préparé, non activé au MVP)
  logo_url       text,
  primary_color  text,
  default_currency currency_code not null default 'CDF',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_tenants_updated before update on tenants
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- schools
-- ------------------------------------------------------------
create table schools (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  address      text,
  logo_url     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz
);
create index idx_schools_tenant on schools (tenant_id);
create trigger trg_schools_updated before update on schools
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- profiles : profil applicatif adossé à auth.users
-- ------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  full_name    text,
  role         app_role not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_profiles_tenant on profiles (tenant_id);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- user_schools : rattachement comptable/directeur ↔ école(s)
-- (le owner voit toutes les écoles de son tenant : pas de ligne requise)
-- ------------------------------------------------------------
create table user_schools (
  user_id      uuid not null references profiles(id) on delete cascade,
  school_id    uuid not null references schools(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, school_id)
);
create index idx_user_schools_school on user_schools (school_id);
