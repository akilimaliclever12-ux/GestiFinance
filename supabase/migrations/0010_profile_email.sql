-- ============================================================
-- GestiFinance — 0010 : email sur profiles (affichage du personnel)
-- ============================================================
-- Permet d'afficher la liste des comptables sans requêter auth.users.
-- Renseigné à la création d'un comptable par le promoteur.
-- ============================================================

alter table profiles add column if not exists email text;

-- Backfill (optionnel) des emails existants depuis auth.users
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;
