-- ============================================================
-- GestiFinance — 0011 : Permissions granulaires des comptables
-- ============================================================
-- Le promoteur peut restreindre un comptable :
--   can_payments  → autorisé à enregistrer les ENTRÉES (paiements)
--   can_expenses  → autorisé à enregistrer les SORTIES (dépenses)
-- Appliqué au niveau RLS (non contournable), pas seulement dans l'UI.
-- ============================================================

alter table profiles add column if not exists can_payments boolean not null default true;
alter table profiles add column if not exists can_expenses boolean not null default true;

-- Helpers (security definer → pas de récursion RLS)
create or replace function can_record_payments()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select can_payments from profiles where id = auth.uid()), true)
$$;

create or replace function can_record_expenses()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select can_expenses from profiles where id = auth.uid()), true)
$$;

grant execute on function can_record_payments() to authenticated;
grant execute on function can_record_expenses() to authenticated;

-- ------------------------------------------------------------
-- Recréer les policies d'insertion avec le contrôle de permission
-- ------------------------------------------------------------
drop policy if exists pe_insert_payment on payment_events;
create policy pe_insert_payment on payment_events for insert
  with check (
    tenant_id = current_tenant_id()
    and current_app_role() = 'accountant'
    and has_school_access(school_id)
    and event_type = 'payment'
    and created_by = auth.uid()
    and can_record_payments()
  );

drop policy if exists exp_insert on expense_events;
create policy exp_insert on expense_events for insert
  with check (
    tenant_id = current_tenant_id()
    and current_app_role() = 'accountant'
    and has_school_access(school_id)
    and event_type = 'expense'
    and created_by = auth.uid()
    and can_record_expenses()
  );
