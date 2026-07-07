-- ============================================================
-- COMERCIOS — columnas dedicadas para settings antes compartidos
-- ============================================================
alter table public.comercios
  add column if not exists commercial_settings jsonb not null default '{}'::jsonb,
  add column if not exists invoice_settings jsonb not null default '{}'::jsonb;
