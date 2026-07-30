-- ============================================================
-- GestiFinance — 0007 : Vues dérivées (recettes, solvabilité)
-- ============================================================
-- Vues "montants"  → security_invoker = on  : la RLS des tables de
--   base s'applique (owner/comptable seulement, le directeur voit 0 ligne).
-- Vue "statut"     → security_definer (défaut) + filtre interne
--   has_school_access : accessible au directeur SANS aucun montant.
-- ============================================================

-- Paiements effectifs = 'payment' non annulés
create view payments_effective
  with (security_invoker = on) as
select p.*
from payment_events p
where p.event_type = 'payment'
  and not exists (
    select 1 from payment_events c
    where c.event_type = 'cancellation'
      and c.cancels_event_id = p.id
  );

-- Total payé par élève / type de frais / devise
create view student_paid
  with (security_invoker = on) as
select student_id, fee_type_id, currency, sum(amount) as total_paid
from payments_effective
group by student_id, fee_type_id, currency;

-- Montant attendu par élève / type de frais
create view student_expected
  with (security_invoker = on) as
select
  s.id            as student_id,
  s.school_id,
  ft.id           as fee_type_id,
  ft.currency,
  coalesce(sum(fs.amount_expected), 0) as total_expected
from students s
join fee_types ft     on ft.school_id = s.school_id and ft.deleted_at is null
join fee_schedules fs on fs.fee_type_id = ft.id and fs.deleted_at is null
  and (fs.class_name is null or fs.class_name = s.class_name)
where s.deleted_at is null
group by s.id, s.school_id, ft.id, ft.currency;

-- Détail de solvabilité AVEC montants (owner/comptable)
create view student_solvency_detail
  with (security_invoker = on) as
select
  e.student_id,
  e.school_id,
  e.fee_type_id,
  e.currency,
  e.total_expected,
  coalesce(pd.total_paid, 0)                     as total_paid,
  e.total_expected - coalesce(pd.total_paid, 0)  as balance,
  (e.total_expected - coalesce(pd.total_paid, 0)) <= 0 as is_in_order
from student_expected e
left join student_paid pd
  on pd.student_id  = e.student_id
 and pd.fee_type_id = e.fee_type_id;

-- ------------------------------------------------------------
-- Statut global SANS montants — destiné au directeur/préfet.
-- Vue security-definer : elle lit les tables de base avec les droits
-- du propriétaire, MAIS se filtre elle-même par has_school_access().
-- Elle n'expose que des booléens et l'identité de l'élève.
-- ------------------------------------------------------------
create view student_solvency_status as
with detail as (
  select
    s.id  as student_id,
    s.school_id,
    (coalesce(sum(fs.amount_expected), 0) - coalesce(paid.total_paid, 0)) <= 0 as is_in_order
  from students s
  join fee_types ft     on ft.school_id = s.school_id and ft.deleted_at is null
  join fee_schedules fs on fs.fee_type_id = ft.id and fs.deleted_at is null
    and (fs.class_name is null or fs.class_name = s.class_name)
  left join (
    select student_id, fee_type_id, sum(amount) as total_paid
    from payment_events pe
    where pe.event_type = 'payment'
      and not exists (
        select 1 from payment_events c
        where c.event_type = 'cancellation' and c.cancels_event_id = pe.id
      )
    group by student_id, fee_type_id
  ) paid on paid.student_id = s.id and paid.fee_type_id = ft.id
  where s.deleted_at is null
  group by s.id, s.school_id, paid.total_paid
)
select
  s.id        as student_id,
  s.school_id,
  s.matricule,
  s.first_name,
  s.last_name,
  s.class_name,
  s.section,
  bool_and(coalesce(d.is_in_order, true)) as is_in_order
from students s
left join detail d on d.student_id = s.id
where s.deleted_at is null
  and has_school_access(s.school_id)          -- filtre de sécurité interne
group by s.id, s.school_id, s.matricule, s.first_name, s.last_name, s.class_name, s.section;

-- Grants : le statut est lisible par tous les rôles connectés ;
-- les vues "montants" restent protégées par la RLS des tables de base.
grant select on student_solvency_status to authenticated;
revoke all on student_solvency_status from anon;
