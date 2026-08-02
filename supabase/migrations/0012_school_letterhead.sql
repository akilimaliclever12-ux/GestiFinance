-- ============================================================
-- GestiFinance — 0012 : En-tête officiel des écoles (pour les rapports)
-- ============================================================
-- Le promoteur définit ces informations ; elles coiffent les rapports
-- (et pourront servir aux reçus). logo_url existe déjà (0002).
-- ============================================================

alter table schools add column if not exists official_name text;  -- nom officiel complet
alter table schools add column if not exists header_top   text;   -- ex. RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
alter table schools add column if not exists sub_header    text;   -- ex. Ministère de l'EPST
alter table schools add column if not exists motto         text;   -- devise
alter table schools add column if not exists phone         text;
alter table schools add column if not exists email         text;
alter table schools add column if not exists bp            text;   -- boîte postale
