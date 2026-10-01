-- ============================================================
-- GestiFinance — 0018 : Logos d'écoles cloisonnés par organisation
-- ============================================================
-- Faille corrigée : les policies de 0013 vérifiaient seulement le rôle
-- « owner », pas l'appartenance de l'école. Avec l'inscription en
-- libre-service, le promoteur d'une AUTRE organisation pouvait remplacer
-- ou supprimer le logo de vos écoles (reçus et rapports défigurés).
--
-- Les fichiers sont nommés « <id de l'école>.<extension> » : on n'autorise
-- l'écriture que si cette école appartient à l'organisation du promoteur.
-- La lecture reste publique (affichage sur reçus, rapports, espace parent).
--
-- Bonus : taille max 2 Mo et formats image courants uniquement.
-- ============================================================

-- L'école visée par un fichier du bucket appartient-elle au promoteur ?
create or replace function public.owns_logo_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'owner'
     and exists (
       select 1 from schools s
       where s.id::text = split_part(object_name, '.', 1)
         and s.tenant_id = public.current_tenant_id()
     )
$$;

revoke execute on function public.owns_logo_object(text) from public, anon;
grant execute on function public.owns_logo_object(text) to authenticated;

drop policy if exists "logos owner insert" on storage.objects;
drop policy if exists "logos owner update" on storage.objects;
drop policy if exists "logos owner delete" on storage.objects;

create policy "logos owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.owns_logo_object(name));

create policy "logos owner update" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.owns_logo_object(name))
  with check (bucket_id = 'logos' and public.owns_logo_object(name));

create policy "logos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.owns_logo_object(name));

-- Garde-fous du bucket : 2 Mo max, images PNG / JPEG / WebP
update storage.buckets
set file_size_limit = 2 * 1024 * 1024,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'logos';
