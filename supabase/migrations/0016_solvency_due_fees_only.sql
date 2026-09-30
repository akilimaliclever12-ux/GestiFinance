-- ============================================================
-- GestiFinance — 0016 : Solvabilité sur les frais échus uniquement
-- ============================================================
-- Règle métier : un élève est « en ordre » s'il a payé tout ce qui est
-- exigible à ce jour, c.-à-d. les tranches (fee_schedules) dont
-- l'échéance est passée ou non renseignée. Les tranches à venir ne le
-- rendent pas « non en ordre » ; un paiement anticipé reste compté.
--
-- Concerne uniquement le statut (vue directeur + compteur promoteur).
-- student_solvency_detail garde le reste à payer sur l'année (écran de
-- paiement du comptable, plafond de saisie).
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
    -- seules les tranches échues comptent (sans échéance = exigible)
    and (fs.due_date is null or fs.due_date <= current_date)
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
