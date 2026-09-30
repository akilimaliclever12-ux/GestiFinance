-- ============================================================
-- GestiFinance — 0015 : Correction de student_solvency_status
-- ============================================================
-- Bug : le CTE « detail » regroupait par (élève, total payé) au lieu de
-- (élève, type de frais). Deux types de frais ayant le même total payé
-- étaient fusionnés : attendu additionné, payé compté une seule fois.
-- Ex. Minerval 100/100 + Examen 100/100 → 200 − 100 > 0 → « non en ordre »
-- alors que l'élève a tout payé.
--
-- Correctif : un statut par (élève, type de frais), puis bool_and.
-- Colonnes identiques → create or replace conserve les grants.
-- ============================================================

create or replace view student_solvency_status as
with detail as (
  select
    s.id  as student_id,
    ft.id as fee_type_id,
    -- paid.total_paid est répété sur chaque barème du type de frais → max()
    (sum(fs.amount_expected) - coalesce(max(paid.total_paid), 0)) <= 0 as is_in_order
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
  group by s.id, ft.id
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

grant select on student_solvency_status to authenticated;
revoke all on student_solvency_status from anon;
