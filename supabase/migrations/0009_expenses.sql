-- ============================================================
-- GestiFinance — 0009 : Dépenses (livre de caisse, append-only)
-- ============================================================
-- Miroir des paiements : une dépense n'est jamais modifiée/supprimée,
-- une correction = un événement 'cancellation' autorisé par le promoteur.
-- ============================================================

-- Mode de paiement d'une dépense
do $$ begin
  create type payment_method as enum ('cash', 'bank', 'mobile_money', 'other');
exception when duplicate_object then null; end $$;

-- Type d'événement de dépense
do $$ begin
  create type expense_event_type as enum ('expense', 'cancellation');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Catégories de dépenses (paramétrables par école) — labels seuls.
-- La devise est portée par la dépense (une catégorie peut être payée
-- en BIF ou en USD selon les cas).
-- ------------------------------------------------------------
create table expense_categories (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  synced_at   timestamptz
);
create index idx_expense_categories_school on expense_categories (school_id);
create trigger trg_expense_categories_updated before update on expense_categories
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- expense_events — cœur append-only des sorties
-- ------------------------------------------------------------
create table expense_events (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  school_id        uuid not null references schools(id) on delete cascade,
  category_id      uuid references expense_categories(id),

  event_type       expense_event_type not null default 'expense',
  cancels_event_id uuid references expense_events(id),

  beneficiary      text,                       -- à qui la dépense est payée
  amount           numeric(14,2) not null check (amount > 0),
  currency         currency_code not null,
  payment_method   payment_method,
  reference        text,                       -- n° de pièce / facture
  paid_at          date not null,
  note             text,

  created_by       uuid not null references profiles(id),
  authorized_by    uuid references profiles(id),  -- requis pour une annulation
  created_at       timestamptz not null default now(),
  synced_at        timestamptz,

  constraint chk_exp_cancellation check (
    (event_type = 'expense'      and cancels_event_id is null) or
    (event_type = 'cancellation' and cancels_event_id is not null and authorized_by is not null)
  )
);

create index idx_exp_school on expense_events (school_id, paid_at);
create index idx_exp_category on expense_events (category_id);
create index idx_exp_cancels on expense_events (cancels_event_id);

-- Une dépense ne peut être annulée qu'une fois.
create unique index uq_exp_one_cancellation
  on expense_events (cancels_event_id)
  where event_type = 'cancellation';

-- Append-only : interdit UPDATE / DELETE (réutilise forbid_mutation de 0005).
create trigger trg_exp_no_update before update on expense_events
  for each row execute function forbid_mutation();
create trigger trg_exp_no_delete before delete on expense_events
  for each row execute function forbid_mutation();

-- ------------------------------------------------------------
-- Vue : dépenses effectives (non annulées)
-- ------------------------------------------------------------
create view expenses_effective
  with (security_invoker = on) as
select e.*
from expense_events e
where e.event_type = 'expense'
  and not exists (
    select 1 from expense_events c
    where c.event_type = 'cancellation'
      and c.cancels_event_id = e.id
  );

-- ============================================================
-- RLS — même logique que payment_events (directeur EXCLU).
-- ============================================================
alter table expense_categories enable row level security;
alter table expense_events     enable row level security;

-- Catégories : lecture owner/comptable ; écriture owner+comptable de l'école.
create policy exp_cat_select on expense_categories for select
  using (tenant_id = current_tenant_id()
         and (current_app_role() = 'owner' or has_school_access(school_id)));
create policy exp_cat_write on expense_categories for all
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id))
  with check (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id));

-- Dépenses : lecture owner + comptable seulement (jamais le directeur).
create policy exp_select on expense_events for select
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner','accountant')
         and has_school_access(school_id));

-- Enregistrement d'une dépense : comptable de l'école.
create policy exp_insert on expense_events for insert
  with check (tenant_id = current_tenant_id()
         and current_app_role() = 'accountant'
         and has_school_access(school_id)
         and event_type = 'expense'
         and created_by = auth.uid());

-- Annulation : autorisée par un promoteur (owner) du tenant.
create policy exp_insert_cancel on expense_events for insert
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
-- Pas de policy UPDATE/DELETE → refus (renforce le trigger append-only).
