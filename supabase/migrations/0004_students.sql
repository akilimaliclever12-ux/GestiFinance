-- ============================================================
-- GestiFinance — 0004 : Élèves
-- ============================================================

create table students (
  id           uuid primary key default gen_random_uuid(),   -- UUID généré côté client
  tenant_id    uuid not null references tenants(id) on delete cascade,
  school_id    uuid not null references schools(id) on delete cascade,
  matricule    text not null,
  first_name   text not null,
  last_name    text not null,
  class_name   text,
  section      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz
);
create index idx_students_school on students (school_id);

-- Matricule unique par école (élèves actifs)
create unique index uq_students_matricule_school
  on students (school_id, matricule) where deleted_at is null;

create trigger trg_students_updated before update on students
  for each row execute function set_updated_at();
