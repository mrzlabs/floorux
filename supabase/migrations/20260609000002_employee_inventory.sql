alter table public.products
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.inventory_movements
  add column if not exists observation text;

drop policy if exists "products_same_comercio" on public.products;
drop policy if exists "admin_manage_products" on public.products;
drop policy if exists "empleado_update_stock" on public.products;
drop policy if exists "operate_products" on public.products;

create policy "products_select" on public.products
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

create policy "products_admin_insert" on public.products
  for insert to authenticated
  with check (
    public.auth_profile_role() in ('admin', 'super_admin', 'super_super_admin')
    and public.auth_can_manage_comercio(comercio_id)
  );

create policy "products_employee_insert" on public.products
  for insert to authenticated
  with check (
    public.auth_profile_role() = 'empleado'
    and comercio_id = public.auth_comercio_id()
    and created_by = auth.uid()
    and cost = 0
    and stock = 0
    and initial_stock = 0
    and min_stock = 0
    and dist is null
  );

create policy "products_admin_update" on public.products
  for update to authenticated
  using (
    public.auth_profile_role() in ('admin', 'super_admin', 'super_super_admin')
    and public.auth_can_manage_comercio(comercio_id)
  )
  with check (
    public.auth_profile_role() in ('admin', 'super_admin', 'super_super_admin')
    and public.auth_can_manage_comercio(comercio_id)
  );

create policy "products_admin_delete" on public.products
  for delete to authenticated
  using (
    public.auth_profile_role() in ('admin', 'super_admin', 'super_super_admin')
    and public.auth_can_manage_comercio(comercio_id)
  );

create or replace function public.track_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  movement_reason text;
  movement_source text;
  movement_observation text;
begin
  if new.stock is distinct from old.stock then
    movement_reason := nullif(current_setting('app.inventory_reason', true), '');
    movement_source := nullif(current_setting('app.inventory_source', true), '');
    movement_observation := nullif(current_setting('app.inventory_observation', true), '');

    insert into public.inventory_movements (
      comercio_id,
      product_id,
      actor_id,
      delta,
      previous_stock,
      new_stock,
      reason,
      source,
      observation
    ) values (
      new.comercio_id,
      new.id,
      auth.uid(),
      new.stock - old.stock,
      old.stock,
      new.stock,
      coalesce(movement_reason, 'stock_update'),
      coalesce(movement_source, 'products'),
      movement_observation
    );
  end if;
  return new;
end;
$$;

create or replace function public.restock_product(
  p_product_id uuid,
  p_quantity int,
  p_observation text default null
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  product_row public.products;
begin
  if public.auth_profile_role() not in ('empleado', 'admin', 'super_admin', 'super_super_admin') then
    raise exception 'forbidden';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  select *
    into product_row
  from public.products
  where id = p_product_id
    and deleted_at is null
  for update;

  if product_row.id is null then
    raise exception 'product_not_found';
  end if;

  if not public.auth_can_manage_comercio(product_row.comercio_id) then
    raise exception 'forbidden';
  end if;

  perform set_config('app.inventory_reason', 'restock', true);
  perform set_config('app.inventory_source', 'employee_inventory', true);
  perform set_config('app.inventory_observation', coalesce(trim(p_observation), ''), true);

  update public.products
  set stock = stock + p_quantity
  where id = p_product_id
  returning * into product_row;

  return product_row;
end;
$$;

create or replace function public.add_product_to_mesa(
  p_mesa_id uuid,
  p_product_id uuid
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  mesa_row public.mesas;
  product_row public.products;
  current_qty int;
  resulting_stock int;
begin
  if public.auth_profile_role() not in ('empleado', 'admin', 'super_admin', 'super_super_admin') then
    raise exception 'forbidden';
  end if;

  select *
    into mesa_row
  from public.mesas
  where id = p_mesa_id
  for update;

  if mesa_row.id is null or mesa_row.status <> 'ocupada' then
    raise exception 'mesa_not_available';
  end if;

  if not public.auth_can_manage_comercio(mesa_row.comercio_id) then
    raise exception 'forbidden';
  end if;

  select *
    into product_row
  from public.products
  where id = p_product_id
    and comercio_id = mesa_row.comercio_id
    and deleted_at is null
  for update;

  if product_row.id is null then
    raise exception 'product_not_found';
  end if;

  if product_row.stock <= 0 then
    raise exception 'insufficient_stock';
  end if;

  perform set_config('app.inventory_reason', 'mesa_consumption', true);
  perform set_config('app.inventory_source', 'mesas', true);
  perform set_config('app.inventory_observation', mesa_row.name, true);

  update public.products
  set stock = stock - 1
  where id = p_product_id
  returning stock into resulting_stock;

  select qty
    into current_qty
  from public.mesa_items
  where mesa_id = p_mesa_id
    and product_id = p_product_id
  for update;

  if current_qty is null then
    insert into public.mesa_items (
      mesa_id,
      product_id,
      qty,
      unit_price,
      unit_cost
    ) values (
      p_mesa_id,
      p_product_id,
      1,
      product_row.price,
      product_row.cost
    );
  else
    update public.mesa_items
    set qty = current_qty + 1
    where mesa_id = p_mesa_id
      and product_id = p_product_id;
  end if;

  return resulting_stock;
end;
$$;

create or replace function public.audit_product_create()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (
    actor_id,
    actor_role,
    action,
    table_name,
    record_id,
    payload
  ) values (
    auth.uid(),
    public.auth_profile_role(),
    'CREATE',
    'products',
    new.id,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists products_create_audit on public.products;
create trigger products_create_audit
  after insert on public.products
  for each row execute function public.audit_product_create();

create or replace function public.audit_product_archive()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.audit_logs (
      actor_id,
      actor_role,
      action,
      table_name,
      record_id,
      payload
    ) values (
      auth.uid(),
      public.auth_profile_role(),
      'DELETE',
      'products',
      new.id,
      jsonb_build_object('deleted_at', new.deleted_at, 'name', new.name)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists products_archive_audit on public.products;
create trigger products_archive_audit
  after update of deleted_at on public.products
  for each row execute function public.audit_product_archive();

revoke all on function public.restock_product(uuid, int, text) from public;
revoke all on function public.add_product_to_mesa(uuid, uuid) from public;
grant execute on function public.restock_product(uuid, int, text) to authenticated;
grant execute on function public.add_product_to_mesa(uuid, uuid) to authenticated;

drop policy if exists "inventory_movements_access" on public.inventory_movements;
create policy "inventory_movements_select" on public.inventory_movements
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );
