-- ============================================================
-- GestiFinance — 0017 : Espace parent (accès par code)
-- ============================================================
-- Le comptable (ou le promoteur) génère un code secret par élève et le
-- remet au parent (reçu, WhatsApp…). Le parent consulte, SANS compte,
-- la situation de son enfant : statut, frais, payé, reste, tranches.
--
-- Sécurité :
--  - parent_access_codes n'est lisible/modifiable que par owner/comptable
--    ayant accès à l'école (RLS) ; jamais par le directeur ni par anon.
--  - parent_statement(code) est SECURITY DEFINER, exécutable par anon :
--    il ne renvoie QUE l'élève correspondant au code exact, et seulement
--    identité + frais/tranches + total payé par type de frais (pas
--    d'historique détaillé, pas de bordereaux, pas d'autres élèves).
--  - Codes de 10 caractères sur un alphabet de 32 symboles sans
--    ambiguïté (pas de 0/O ni 1/I) : 32^10 ≈ 1,1 × 10^15 combinaisons.
--  - Un seul code actif par élève ; régénérer invalide l'ancien,
--    révoquer = supprimer la ligne.
-- ============================================================

create table parent_access_codes (
  student_id  uuid primary key references students(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  school_id   uuid not null references schools(id) on delete cascade,
  code        text not null unique,               -- format XXXXX-XXXXX
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);
create index idx_pac_school on parent_access_codes (school_id);

alter table parent_access_codes enable row level security;

create policy pac_select on parent_access_codes for select
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner', 'accountant')
         and has_school_access(school_id));
create policy pac_insert on parent_access_codes for insert
  with check (tenant_id = current_tenant_id()
              and current_app_role() in ('owner', 'accountant')
              and has_school_access(school_id));
create policy pac_update on parent_access_codes for update
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner', 'accountant')
         and has_school_access(school_id))
  with check (tenant_id = current_tenant_id()
              and current_app_role() in ('owner', 'accountant')
              and has_school_access(school_id));
create policy pac_delete on parent_access_codes for delete
  using (tenant_id = current_tenant_id()
         and current_app_role() in ('owner', 'accountant')
         and has_school_access(school_id));

revoke all on parent_access_codes from anon;

-- ------------------------------------------------------------
-- Génération d'un code aléatoire XXXXX-XXXXX
-- Aléa : octets aléatoires d'un UUID v4 (gen_random_uuid, natif PG13+),
-- en évitant les octets 6 et 8 qui portent version / variante.
-- 256 est multiple de 32 → tirage uniforme sur l'alphabet.
-- ------------------------------------------------------------
create or replace function new_parent_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  b bytea := uuid_send(gen_random_uuid());
  idx int[] := array[0, 1, 2, 3, 4, 5, 9, 10, 11, 12];
  s text := '';
  i int;
begin
  foreach i in array idx loop
    s := s || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return substr(s, 1, 5) || '-' || substr(s, 6, 5);
end $$;

-- ------------------------------------------------------------
-- (Re)génère le code d'un élève. SECURITY INVOKER : la RLS de
-- students et de parent_access_codes s'applique à l'appelant.
-- ------------------------------------------------------------
create or replace function set_parent_code(p_student uuid)
returns text
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  st record;
  v_code text;
begin
  -- coalesce : sans session, current_app_role() est NULL (NOT IN renverrait NULL)
  if coalesce(current_app_role()::text, '') not in ('owner', 'accountant') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id, tenant_id, school_id into st
  from students where id = p_student and deleted_at is null;
  if not found then
    raise exception 'student_not_found' using errcode = 'P0002';
  end if;

  -- collision (quasi impossible) : on retente
  loop
    v_code := new_parent_code();
    begin
      insert into parent_access_codes (student_id, tenant_id, school_id, code, created_by)
      values (st.id, st.tenant_id, st.school_id, v_code, auth.uid())
      on conflict (student_id) do update
        set code = excluded.code, created_by = excluded.created_by, created_at = now();
      return v_code;
    exception when unique_violation then
      -- code déjà pris par un autre élève : nouveau tirage
    end;
  end loop;
end $$;

-- Par défaut, Postgres accorde EXECUTE à PUBLIC : on le retire explicitement.
revoke execute on function new_parent_code() from public, anon;
revoke execute on function set_parent_code(uuid) from public, anon;
grant execute on function new_parent_code() to authenticated;
grant execute on function set_parent_code(uuid) to authenticated;

-- ------------------------------------------------------------
-- Situation d'un élève pour le parent (anon). NULL si code inconnu.
-- Le code est comparé sans tiret ni espace, insensible à la casse.
-- ------------------------------------------------------------
create or replace function parent_statement(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'student', jsonb_build_object(
      'first_name', s.first_name,
      'last_name',  s.last_name,
      'matricule',  s.matricule,
      'class_name', s.class_name,
      'section',    s.section
    ),
    'school', jsonb_build_object(
      'name',     coalesce(sc.official_name, sc.name),
      'logo_url', sc.logo_url
    ),
    'fees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fee_type_id', ft.id,
        'name',        ft.name,
        'currency',    ft.currency,
        'schedules', coalesce((
          select jsonb_agg(jsonb_build_object('amount', fs.amount_expected, 'due_date', fs.due_date)
                           order by fs.due_date nulls first)
          from fee_schedules fs
          where fs.fee_type_id = ft.id and fs.deleted_at is null
            and (fs.class_name is null or fs.class_name = s.class_name)
        ), '[]'::jsonb),
        'paid', coalesce((
          select sum(pe.amount)
          from payment_events pe
          where pe.student_id = s.id and pe.fee_type_id = ft.id
            and pe.event_type = 'payment'
            and not exists (
              select 1 from payment_events c
              where c.event_type = 'cancellation' and c.cancels_event_id = pe.id
            )
        ), 0)
      ) order by ft.name)
      from fee_types ft
      where ft.school_id = s.school_id and ft.deleted_at is null
    ), '[]'::jsonb)
  )
  from (select regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g') as c) n
  join parent_access_codes pac
    on length(n.c) = 10
   and pac.code = substr(n.c, 1, 5) || '-' || substr(n.c, 6, 5)   -- utilise l'index unique
  join students s on s.id = pac.student_id and s.deleted_at is null
  join schools sc on sc.id = s.school_id
$$;

revoke execute on function parent_statement(text) from public;
grant execute on function parent_statement(text) to anon, authenticated;
