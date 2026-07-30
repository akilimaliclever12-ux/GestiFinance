-- ============================================================
-- GestiFinance — SEED : tenant pilote « ECOBU »
-- ============================================================
-- Écoles congolaises situées au Burundi → devise par défaut BIF.
-- On exerce le multi-devises : minerval en BIF, frais d'examen en USD.
-- UUID fixes pour rester référençables entre environnements.
-- ============================================================

-- Tenant (le promoteur d'ECOBU)
insert into tenants (id, name, default_currency, primary_color)
values ('11111111-1111-1111-1111-111111111111', 'ECOBU', 'BIF', '#0B6E4F')
on conflict (id) do nothing;

-- Écoles
insert into schools (id, tenant_id, name, address) values
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-111111111111', 'ECOBU Primaire',    'Bujumbura, Burundi'),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-111111111111', 'ECOBU Secondaire',  'Bujumbura, Burundi')
on conflict (id) do nothing;

-- Banques
insert into banks (id, tenant_id, school_id, name) values
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000001', 'BANCOBU'),
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000001', 'Interbank Burundi'),
  ('33333333-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'BANCOBU'),
  ('33333333-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'BCB')
on conflict (id) do nothing;

-- Types de frais (multi-devises)
insert into fee_types (id, tenant_id, school_id, name, currency) values
  ('44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Minerval',        'BIF'),
  ('44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Frais d''inscription', 'BIF'),
  ('44444444-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Frais d''examen d''État', 'USD')
on conflict (id) do nothing;

-- Barèmes (montants attendus)
insert into fee_schedules (id, tenant_id, school_id, fee_type_id, class_name, amount_expected, due_date) values
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', '44444444-0000-0000-0000-000000000001', null,   300000, '2026-10-15'),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', '44444444-0000-0000-0000-000000000002', null,    50000, '2026-09-30'),
  ('55555555-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', '44444444-0000-0000-0000-000000000003', '6ème', 40, '2027-02-01')
on conflict (id) do nothing;

-- Catégories de dépenses (livre de caisse) — ECOBU Secondaire
insert into expense_categories (id, tenant_id, school_id, name) values
  ('66666666-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Salaires enseignants'),
  ('66666666-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Loyer'),
  ('66666666-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Fournitures scolaires'),
  ('66666666-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Entretien & réparations'),
  ('66666666-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Eau & électricité'),
  ('66666666-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Transport'),
  ('66666666-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-000000000002', 'Autres')
on conflict (id) do nothing;

-- ============================================================
-- Rattacher les comptes utilisateurs au tenant ECOBU.
-- Les comptes doivent d'abord exister dans Supabase Auth
-- (Dashboard > Authentication > Users, ou signup dans l'app).
-- On retrouve l'utilisateur par son EMAIL (pas besoin de son UUID).
-- ============================================================

-- 1) PROMOTEUR (owner) — voit toutes les écoles du tenant.
insert into profiles (id, tenant_id, full_name, role)
select u.id, '11111111-1111-1111-1111-111111111111', 'Promoteur ECOBU', 'owner'
from auth.users u
where u.email = 'financegesti@gmail.com'
on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      full_name = excluded.full_name,
      role      = excluded.role;

-- ------------------------------------------------------------
-- 2) COMPTABLE (accountant) — rattaché à au moins une école.
--    IMPORTANT : créez d'abord le compte dans Authentication > Users
--    (avec « Auto Confirm User »). Décommentez ce bloc et adaptez
--    l'email. La version DO $$ échoue proprement si le compte
--    n'existe pas (évite l'erreur user_id NULL).
-- ------------------------------------------------------------
-- do $$
-- declare
--   v_user   uuid;
--   v_tenant uuid := '11111111-1111-1111-1111-111111111111';
-- begin
--   select id into v_user from auth.users where email = 'comptable.ecobu@gmail.com';
--   if v_user is null then
--     raise exception 'Aucun compte Auth avec cet email — créez-le dans Authentication > Users.';
--   end if;
--   insert into profiles (id, tenant_id, full_name, role)
--   values (v_user, v_tenant, 'Comptable ECOBU', 'accountant')
--   on conflict (id) do update set role = 'accountant', tenant_id = excluded.tenant_id;
--   insert into user_schools (user_id, school_id)
--   select v_user, s.id from schools s where s.tenant_id = v_tenant
--   on conflict do nothing;
-- end $$;

-- ------------------------------------------------------------
-- 3) DIRECTEUR / PRÉFET (controller) — voit seulement le statut,
--    jamais les montants. Même principe : créez d'abord le compte.
-- ------------------------------------------------------------
-- do $$
-- declare
--   v_user   uuid;
--   v_tenant uuid := '11111111-1111-1111-1111-111111111111';
-- begin
--   select id into v_user from auth.users where email = 'directeur.ecobu@gmail.com';
--   if v_user is null then
--     raise exception 'Aucun compte Auth avec cet email — créez-le dans Authentication > Users.';
--   end if;
--   insert into profiles (id, tenant_id, full_name, role)
--   values (v_user, v_tenant, 'Directeur ECOBU', 'controller')
--   on conflict (id) do update set role = 'controller', tenant_id = excluded.tenant_id;
--   -- rattacher à ECOBU Secondaire (adaptez si besoin) :
--   insert into user_schools (user_id, school_id)
--   values (v_user, '22222222-2222-2222-2222-000000000002')
--   on conflict do nothing;
-- end $$;
