-- ============================================================
-- GestiFinance — 0008 : Row Level Security (isolation multi-tenant + RBAC)
-- ============================================================

alter table tenants        enable row level security;
alter table schools        enable row level security;
alter table profiles       enable row level security;
alter table user_schools   enable row level security;
alter table banks          enable row level security;
alter table fee_types      enable row level security;
alter table fee_schedules  enable row level security;
alter table students       enable row level security;
alter table payment_events enable row level security;

-- ------------------------------------------------------------
-- tenants
-- ------------------------------------------------------------
create policy tenants_select on tenants for select
  using (id = current_tenant_id());
create policy tenants_update on tenants for update
  using (id = current_tenant_id() and current_app_role() = 'owner');

-- ------------------------------------------------------------
-- schools
-- ------------------------------------------------------------
create policy schools_select on schools for select
  using (tenant_id = current_tenant_id()
         and (current_app_role() = 'owner' or has_school_access(id)));
create policy schools_write on schools for all
  using (tenant_id = current_tenant_id() and current_app_role() = 'owner')
  with check (tenant_id = current_tenant_id() and current_app_role() = 'owner');

-- ------------------------------------------------------------
-- profiles  (current_tenant_id() est SECURITY DEFINER → pas de récursion)
-- ------------------------------------------------------------
create policy profiles_select on profiles for select
  using (tenant_id = current_tenant_id());
create policy profiles_write on profiles for all
  using (tenant_id = current_tenant_id() and current_app_role() = 'owner')
  with check (tenant_id = current_tenant_id() and current_app_role() = 'owner');

-- ------------------------------------------------------------
-- user_schools
-- ------------------------------------------------------------
create policy user_schools_select on user_schools for select
  using (has_school_access(school_id) or current_app_role() = 'owner');
create policy user_schools_write on user_schools for all
  using (current_app_role() = 'owner'
         and school_id in (select id from schools where tenant_id = current_tenant_id()))
  with check (current_app_role() = 'owner'
         and school_id in (select id from schools where tenant_id = current_tenant_id()));

-- ------------------------------------------------------------
-- Données de référence : banks / fee_types / fee_schedules
-- Lecture : owner ou accès école. Écriture : owner + comptable.
-- ------------------------------------------------------------
create policy banks_select on banks for select
  using (tenant_id = current_tenant_id()
         and (current_app_role() = 'owner' or has_school_access(school_id)));
create policy banks_write on banks for all
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id))
  with check (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id));

create policy fee_types_select on fee_types for select
  using (tenant_id = current_tenant_id()
         and (current_app_role() = 'owner' or has_school_access(school_id)));
create policy fee_types_write on fee_types for all
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id))
  with check (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id));

create policy fee_schedules_select on fee_schedules for select
  using (tenant_id = current_tenant_id()
         and (current_app_role() = 'owner' or has_school_access(school_id)));
create policy fee_schedules_write on fee_schedules for all
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id))
  with check (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id));

-- ------------------------------------------------------------
-- students : lecture par owner/comptable/directeur (accès école),
--            écriture par le comptable uniquement.
-- ------------------------------------------------------------
create policy students_select on students for select
  using (tenant_id = current_tenant_id()
         and (current_app_role() = 'owner' or has_school_access(school_id)));
create policy students_insert on students for insert
  with check (tenant_id = current_tenant_id()
         and current_app_role() = 'accountant'
         and has_school_access(school_id));
create policy students_update on students for update
  using (tenant_id = current_tenant_id()
         and current_app_role() = 'accountant'
         and has_school_access(school_id))
  with check (tenant_id = current_tenant_id()
         and current_app_role() = 'accountant'
         and has_school_access(school_id));

-- ------------------------------------------------------------
-- payment_events : append-only. Directeur EXCLU (jamais de montants).
-- ------------------------------------------------------------
-- Lecture : owner + comptable seulement.
create policy pe_select on payment_events for select
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id));

-- Insertion d'un paiement : comptable de l'école.
create policy pe_insert_payment on payment_events for insert
  with check (tenant_id = current_tenant_id()
         and current_app_role() = 'accountant'
         and has_school_access(school_id)
         and event_type = 'payment'
         and created_by = auth.uid());

-- Insertion d'une annulation : par owner/comptable, MAIS autorisée par un owner.
create policy pe_insert_cancel on payment_events for insert
  with check (tenant_id = current_tenant_id()
         and event_type = 'cancellation'
         and has_school_access(school_id)
         and created_by = auth.uid()
         and authorized_by is not null
         and exists (
           select 1 from profiles p
           where p.id = authorized_by
             and p.role = 'owner'
             and p.tenant_id = current_tenant_id()
         ));

-- Pas de policy UPDATE/DELETE → refus par défaut (renforce le trigger append-only).
