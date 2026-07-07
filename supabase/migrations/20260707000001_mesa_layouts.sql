-- ============================================================
-- MESA_LAYOUTS — croquis de mesas, una fila por mesa
-- ============================================================
create table public.mesa_layouts (
  mesa_id     uuid primary key references public.mesas(id) on delete cascade,
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  x           numeric not null default 0,
  y           numeric not null default 0,
  w           numeric not null default 150,
  h           numeric not null default 116,
  shape       text not null default 'rect',
  updated_at  timestamptz not null default now()
);

create trigger mesa_layouts_updated_at before update on public.mesa_layouts
  for each row execute function set_updated_at();

alter table public.mesa_layouts enable row level security;

create policy "mesa_layouts_same_comercio" on public.mesa_layouts
  for all to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  )
  with check (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

alter publication supabase_realtime add table public.mesa_layouts;
