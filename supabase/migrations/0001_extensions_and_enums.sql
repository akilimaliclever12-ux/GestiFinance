-- ============================================================
-- GestiFinance — 0001 : Extensions & types énumérés
-- ============================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- Rôles applicatifs (RBAC)
do $$ begin
  create type app_role as enum ('owner', 'accountant', 'controller');
exception when duplicate_object then null; end $$;

-- Devises supportées : Franc congolais, Dollar US, Franc burundais
do $$ begin
  create type currency_code as enum ('CDF', 'USD', 'BIF');
exception when duplicate_object then null; end $$;

-- Type d'événement financier (modèle append-only)
do $$ begin
  create type payment_event_type as enum ('payment', 'cancellation');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Fonction utilitaire : maintien automatique de updated_at
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
