-- ============================================================
-- GestiFinance — 0005 : Paiements (modèle append-only)
-- ============================================================
-- Un paiement n'est JAMAIS modifié ni supprimé.
-- Une correction = un nouvel événement 'cancellation'.
-- ============================================================

create table payment_events (
  id               uuid primary key default gen_random_uuid(),   -- UUID côté client
  tenant_id        uuid not null references tenants(id) on delete cascade,
  school_id        uuid not null references schools(id) on delete cascade,
  student_id       uuid not null references students(id),
  fee_type_id      uuid not null references fee_types(id),
  bank_id          uuid references banks(id),

  event_type       payment_event_type not null default 'payment',
  cancels_event_id uuid references payment_events(id),

  bordereau_no     text,
  amount           numeric(14,2) not null check (amount > 0),
  currency         currency_code not null,       -- doit correspondre à fee_types.currency
  paid_at          date not null,
  note             text,

  -- Traçabilité
  created_by       uuid not null references profiles(id),
  authorized_by    uuid references profiles(id),  -- requis pour une annulation
  created_at       timestamptz not null default now(),
  synced_at        timestamptz,

  -- Cohérence des événements
  constraint chk_cancellation_ref check (
    (event_type = 'payment'      and cancels_event_id is null) or
    (event_type = 'cancellation' and cancels_event_id is not null and authorized_by is not null)
  )
);

create index idx_pe_student on payment_events (school_id, student_id);
create index idx_pe_paid_at on payment_events (school_id, paid_at);
create index idx_pe_cancels on payment_events (cancels_event_id);

-- GARDE-FOU ANTI-DOUBLON / ANTI-FRAUDE :
-- un numéro de bordereau ne peut exister qu'une fois par école (vrais paiements).
create unique index uq_pe_bordereau_school
  on payment_events (school_id, bordereau_no)
  where event_type = 'payment' and bordereau_no is not null;

-- Un paiement ne peut être annulé qu'une seule fois.
create unique index uq_pe_one_cancellation
  on payment_events (cancels_event_id)
  where event_type = 'cancellation';

-- ------------------------------------------------------------
-- Interdiction stricte de UPDATE / DELETE (append-only)
-- ------------------------------------------------------------
create or replace function forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'payment_events est append-only : UPDATE/DELETE interdit (utilisez une annulation).';
end $$;

create trigger trg_pe_no_update before update on payment_events
  for each row execute function forbid_mutation();
create trigger trg_pe_no_delete before delete on payment_events
  for each row execute function forbid_mutation();
