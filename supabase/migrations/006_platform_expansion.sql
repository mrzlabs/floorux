-- FloorUX platform expansion

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists panel_theme jsonb not null default '{}'::jsonb;

alter table public.comercios
  add column if not exists photo_url text,
  add column if not exists plan_cost numeric not null default 0,
  add column if not exists subscription_start date not null default current_date,
  add column if not exists subscription_end date,
  add column if not exists renewal_day int,
  add column if not exists subscription_status text not null default 'active',
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.comercios drop constraint if exists comercios_renewal_day_check;
alter table public.comercios
  add constraint comercios_renewal_day_check
  check (renewal_day is null or renewal_day between 1 and 28);

alter table public.comercios drop constraint if exists comercios_subscription_status_check;
alter table public.comercios
  add constraint comercios_subscription_status_check
  check (subscription_status in ('active','due','suspended','cancelled'));

alter table public.products
  add column if not exists reference text,
  add column if not exists initial_stock int not null default 0;

create table if not exists public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  plan text not null,
  cost numeric not null default 0,
  starts_at date not null,
  ends_at date,
  status text not null default 'active'
    check (status in ('active','renewed','expired','suspended','cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  super_admin_id uuid not null references public.profiles(id) on delete cascade,
  comercio_id uuid references public.comercios(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open','in_progress','closed')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','critical')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  delta int not null,
  previous_stock int not null,
  new_stock int not null,
  reason text not null default 'adjustment',
  source text not null default 'products',
  created_at timestamptz not null default now()
);

create index if not exists subscription_history_comercio_idx
  on public.subscription_history(comercio_id, created_at desc);
create index if not exists support_tickets_super_idx
  on public.support_tickets(super_admin_id, created_at desc);
create index if not exists inventory_movements_comercio_idx
  on public.inventory_movements(comercio_id, created_at desc);
create index if not exists inventory_movements_product_idx
  on public.inventory_movements(product_id, created_at desc);

create or replace function public.track_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.stock is distinct from old.stock then
    insert into public.inventory_movements (
      comercio_id, product_id, actor_id, delta,
      previous_stock, new_stock, reason, source
    ) values (
      new.comercio_id, new.id, auth.uid(), new.stock - old.stock,
      old.stock, new.stock, 'stock_update', 'products'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists products_stock_audit on public.products;
create trigger products_stock_audit
  after update of stock on public.products
  for each row execute function public.track_product_stock();

alter table public.subscription_history enable row level security;
alter table public.support_tickets enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "subscription_history_access" on public.subscription_history;
create policy "subscription_history_access" on public.subscription_history
  for all to authenticated
  using (public.auth_can_manage_comercio(comercio_id))
  with check (public.auth_can_manage_comercio(comercio_id));

drop policy if exists "support_tickets_access" on public.support_tickets;
create policy "support_tickets_access" on public.support_tickets
  for all to authenticated
  using (
    public.auth_profile_role() = 'super_super_admin'
    or super_admin_id = auth.uid()
    or public.auth_can_manage_comercio(comercio_id)
  )
  with check (
    public.auth_profile_role() = 'super_super_admin'
    or super_admin_id = auth.uid()
    or public.auth_can_manage_comercio(comercio_id)
  );

drop policy if exists "inventory_movements_access" on public.inventory_movements;
create policy "inventory_movements_access" on public.inventory_movements
  for select to authenticated
  using (public.auth_can_manage_comercio(comercio_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('floorux-media', 'floorux-media', true)
on conflict (id) do update set public = true;

drop policy if exists "floorux_media_read" on storage.objects;
create policy "floorux_media_read" on storage.objects
  for select using (bucket_id = 'floorux-media');

drop policy if exists "floorux_media_insert" on storage.objects;
create policy "floorux_media_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'floorux-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "floorux_media_update" on storage.objects;
create policy "floorux_media_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'floorux-media'
    and owner_id = auth.uid()::text
  );
