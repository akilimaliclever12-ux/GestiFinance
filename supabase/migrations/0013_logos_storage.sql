-- ============================================================
-- GestiFinance — 0013 : Stockage des logos d'écoles (Supabase Storage)
-- ============================================================
-- Bucket public "logos" (lecture publique pour l'affichage sur reçus/rapports).
-- Écriture réservée aux promoteurs (owner) authentifiés.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Écriture (upload / remplacement / suppression) : owner authentifié.
do $$ begin
  create policy "logos owner insert" on storage.objects for insert to authenticated
    with check (bucket_id = 'logos' and public.current_app_role() = 'owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "logos owner update" on storage.objects for update to authenticated
    using (bucket_id = 'logos' and public.current_app_role() = 'owner')
    with check (bucket_id = 'logos' and public.current_app_role() = 'owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "logos owner delete" on storage.objects for delete to authenticated
    using (bucket_id = 'logos' and public.current_app_role() = 'owner');
exception when duplicate_object then null; end $$;
