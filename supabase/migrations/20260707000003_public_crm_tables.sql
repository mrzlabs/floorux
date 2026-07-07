-- ============================================================
-- PUBLIC_CUSTOMERS — clientes registrados desde el panel público
-- ============================================================
create table public.public_customers (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  birthday    text,
  visits      int not null default 0,
  total_spent numeric not null default 0,
  last_login  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (comercio_id, email)
);

create trigger public_customers_updated_at before update on public.public_customers
  for each row execute function set_updated_at();

alter table public.public_customers enable row level security;

create policy "public_customers_admin_read" on public.public_customers
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

-- Sin policy de insert/update para authenticated/anon: el endpoint público
-- (app/api/public/local/[comercioId]/route.ts) escribe exclusivamente con
-- el cliente admin (service role), que ignora RLS por diseño.

-- ============================================================
-- PUBLIC_RESERVATIONS — reservas solicitadas desde el panel público
-- ============================================================
create table public.public_reservations (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  customer_id uuid references public.public_customers(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  date        text not null,
  time        text not null,
  party_size  int not null,
  notes       text,
  status      text not null default 'solicitada' check (status in ('solicitada','confirmada','cancelada')),
  created_at  timestamptz not null default now()
);

alter table public.public_reservations enable row level security;

create policy "public_reservations_admin_read" on public.public_reservations
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );
