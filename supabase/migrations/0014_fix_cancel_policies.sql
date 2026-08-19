-- ============================================================
-- GestiFinance — 0014 : Fiabilise les policies d'annulation
-- ============================================================
-- L'ancienne condition validait via une sous-requête sur profiles
-- (authorized_by = un owner). On la remplace par une règle plus simple
-- et robuste : celui qui enregistre l'annulation DOIT être un promoteur
-- (current_app_role() = 'owner'). Effet identique, sans sous-requête.
-- ============================================================

drop policy if exists pe_insert_cancel on payment_events;
create policy pe_insert_cancel on payment_events for insert
  with check (
    tenant_id = current_tenant_id()
    and event_type = 'cancellation'
    and has_school_access(school_id)
    and created_by = auth.uid()
    and current_app_role() = 'owner'
  );

drop policy if exists exp_insert_cancel on expense_events;
create policy exp_insert_cancel on expense_events for insert
  with check (
    tenant_id = current_tenant_id()
    and event_type = 'cancellation'
    and has_school_access(school_id)
    and created_by = auth.uid()
    and current_app_role() = 'owner'
  );
