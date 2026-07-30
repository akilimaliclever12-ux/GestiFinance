-- ============================================================
-- GestiFinance — 0006 : Fonctions d'aide RLS
-- ============================================================
-- SECURITY DEFINER + search_path figé : indispensable pour éviter
-- la récursion infinie des politiques RLS sur profiles/user_schools.
-- ============================================================

-- Tenant de l'utilisateur courant
create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from profiles where id = auth.uid()
$$;

-- Rôle applicatif de l'utilisateur courant
create or replace function current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- L'utilisateur a-t-il accès à cette école ?
--   owner  → toutes les écoles de son tenant
--   autres → uniquement les écoles rattachées (user_schools)
create or replace function has_school_access(target_school uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from profiles p
      join schools s on s.tenant_id = p.tenant_id
      where p.id = auth.uid()
        and p.role = 'owner'
        and s.id = target_school
    )
    or exists (
      select 1 from user_schools us
      where us.user_id = auth.uid()
        and us.school_id = target_school
    );
$$;

grant execute on function current_tenant_id()          to authenticated;
grant execute on function current_app_role()           to authenticated;
grant execute on function has_school_access(uuid)       to authenticated;
