-- ============================================================
-- FloorUX by OperUX · Schema v1
-- ============================================================

-- Helpers
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id            uuid references auth.users primary key,
  full_name     text not null,
  email         text not null,
  role          text not null check (role in ('super_super_admin','super_admin','admin','empleado')),
  super_admin_id uuid references public.profiles(id) on delete set null,
  comercio_id   uuid, -- FK added after comercios table
  activo        boolean not null default true,
  color         text not null default '#7F77DD',
  alias         text,
  avatar_url    text,
  last_login    timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function set_updated_at();

alter table public.profiles enable row level security;

-- super_super_admin vê tudo
create policy "ssa_all" on public.profiles
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

-- super_admin sees their own profiles and their downstream
create policy "sa_read" on public.profiles
  for select using (
    id = auth.uid()
    or super_admin_id = auth.uid()
    or id in (
      select p2.id from public.profiles p2
      join public.comercios c on c.id = p2.comercio_id
      where c.super_admin_id = auth.uid()
    )
  );

-- admin sees profiles in their comercio
create policy "admin_read" on public.profiles
  for select using (
    comercio_id = (select comercio_id from public.profiles where id = auth.uid())
  );

-- self-update
create policy "self_update" on public.profiles
  for update using (id = auth.uid());

-- ============================================================
-- COMERCIOS
-- ============================================================
create table public.comercios (
  id             uuid primary key default gen_random_uuid(),
  super_admin_id uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  type           text not null check (type in ('Discoteca','Taberna','Bar')),
  city           text not null,
  address        text,
  phone          text,
  nit            text,
  plan           text not null default 'Básico' check (plan in ('Básico','Pro')),
  kind           text not null default 'Franquicia' check (kind in ('Principal','Franquicia')),
  status         text not null default 'activo' check (status in ('activo','inactivo')),
  color          text not null default '#7F77DD',
  tables_count   int not null default 10,
  since          date not null default current_date,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger comercios_updated_at before update on public.comercios
  for each row execute function set_updated_at();

-- Add FK on profiles
alter table public.profiles
  add constraint profiles_comercio_id_fk
  foreign key (comercio_id) references public.comercios(id) on delete set null;

alter table public.comercios enable row level security;

create policy "ssa_all_comercios" on public.comercios
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

create policy "sa_own_comercios" on public.comercios
  for all using (super_admin_id = auth.uid());

create policy "admin_own_comercio" on public.comercios
  for select using (
    id = (select comercio_id from public.profiles where id = auth.uid())
  );

create policy "admin_update_comercio" on public.comercios
  for update using (
    id = (select comercio_id from public.profiles where id = auth.uid())
  );

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  name        text not null,
  dist        text,
  cat         text not null,
  sub         text,
  unit        text,
  cost        numeric not null default 0,
  price       numeric not null default 0,
  stock       int not null default 0,
  min_stock   int not null default 0,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger products_updated_at before update on public.products
  for each row execute function set_updated_at();

alter table public.products enable row level security;

create policy "products_same_comercio" on public.products
  for select using (
    comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

create policy "admin_manage_products" on public.products
  for all using (
    comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin','super_super_admin')
  );

create policy "empleado_update_stock" on public.products
  for update using (
    comercio_id = (select comercio_id from public.profiles where id = auth.uid())
  );

-- ============================================================
-- MESAS
-- ============================================================
create table public.mesas (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  name        text not null,
  alias       text,
  status      text not null default 'libre' check (status in ('libre','ocupada')),
  opened_at   timestamptz,
  opened_by   uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger mesas_updated_at before update on public.mesas
  for each row execute function set_updated_at();

alter table public.mesas enable row level security;

create policy "mesas_same_comercio" on public.mesas
  for all using (
    comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

-- ============================================================
-- MESA_ITEMS
-- ============================================================
create table public.mesa_items (
  id         uuid primary key default gen_random_uuid(),
  mesa_id    uuid not null references public.mesas(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty        int not null default 1,
  unit_price numeric not null,
  unit_cost  numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.mesa_items enable row level security;

create policy "mesa_items_same_comercio" on public.mesa_items
  for all using (
    mesa_id in (
      select id from public.mesas
      where comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    )
    or (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

-- ============================================================
-- SHIFTS
-- ============================================================
create table public.shifts (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  empleado_id uuid not null references public.profiles(id),
  started_at  timestamptz not null default now(),
  closed_at   timestamptz,
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger shifts_updated_at before update on public.shifts
  for each row execute function set_updated_at();

alter table public.shifts enable row level security;

create policy "shifts_own" on public.shifts
  for all using (
    empleado_id = auth.uid()
    or comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

-- ============================================================
-- SALES
-- ============================================================
create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  comercio_id    uuid not null references public.comercios(id) on delete cascade,
  shift_id       uuid references public.shifts(id),
  mesa_name      text not null,
  mesa_alias     text,
  total          numeric not null,
  cost           numeric not null default 0,
  payment_method text not null,
  evidence       boolean not null default false,
  closed_at      timestamptz not null default now(),
  closed_by      uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

alter table public.sales enable row level security;

create policy "sales_same_comercio" on public.sales
  for all using (
    comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) in ('super_super_admin','super_admin')
  );

-- ============================================================
-- SALE_ITEMS
-- ============================================================
create table public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales(id) on delete cascade,
  product_id   uuid references public.products(id),
  product_name text not null,
  qty          int not null,
  unit_price   numeric not null,
  unit_cost    numeric not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.sale_items enable row level security;

create policy "sale_items_via_sales" on public.sale_items
  for all using (
    sale_id in (
      select id from public.sales
      where comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    )
    or (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  comercio_id  uuid not null references public.comercios(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id),
  recipient_id uuid references public.profiles(id),
  body         text not null,
  read_at      timestamptz,
  sent_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_same_comercio" on public.messages
  for all using (
    comercio_id = (select comercio_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id),
  actor_role text,
  action     text not null check (action in ('CREATE','UPDATE','DELETE','LOGIN','SUSPEND')),
  table_name text,
  record_id  uuid,
  payload    jsonb,
  ip         text,
  ts         timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- only super_super_admin can read audit logs
create policy "audit_ssa_only" on public.audit_logs
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'super_super_admin'
  );

-- all authenticated users can insert (server actions use service_role)
create policy "audit_insert" on public.audit_logs
  for insert with check (true);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.mesas;
alter publication supabase_realtime add table public.mesa_items;
alter publication supabase_realtime add table public.messages;
