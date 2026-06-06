create or replace function public.auth_can_manage_comercio(target_comercio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.auth_profile_role() = 'super_super_admin'
    or public.auth_owns_comercio(target_comercio_id)
    or public.auth_comercio_id() = target_comercio_id
$$;

revoke all on function public.auth_can_manage_comercio(uuid) from public;
grant execute on function public.auth_can_manage_comercio(uuid) to authenticated;

drop policy if exists "operate_products" on public.products;
create policy "operate_products" on public.products
  for all to authenticated
  using (public.auth_can_manage_comercio(comercio_id))
  with check (public.auth_can_manage_comercio(comercio_id));

drop policy if exists "operate_mesas" on public.mesas;
create policy "operate_mesas" on public.mesas
  for all to authenticated
  using (public.auth_can_manage_comercio(comercio_id))
  with check (public.auth_can_manage_comercio(comercio_id));

drop policy if exists "operate_mesa_items" on public.mesa_items;
create policy "operate_mesa_items" on public.mesa_items
  for all to authenticated
  using (
    exists (
      select 1 from public.mesas
      where mesas.id = mesa_items.mesa_id
        and public.auth_can_manage_comercio(mesas.comercio_id)
    )
  )
  with check (
    exists (
      select 1 from public.mesas
      where mesas.id = mesa_items.mesa_id
        and public.auth_can_manage_comercio(mesas.comercio_id)
    )
  );

drop policy if exists "operate_shifts" on public.shifts;
create policy "operate_shifts" on public.shifts
  for all to authenticated
  using (public.auth_can_manage_comercio(comercio_id))
  with check (public.auth_can_manage_comercio(comercio_id));

drop policy if exists "operate_sales" on public.sales;
create policy "operate_sales" on public.sales
  for all to authenticated
  using (public.auth_can_manage_comercio(comercio_id))
  with check (public.auth_can_manage_comercio(comercio_id));

drop policy if exists "operate_sale_items" on public.sale_items;
create policy "operate_sale_items" on public.sale_items
  for all to authenticated
  using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
        and public.auth_can_manage_comercio(sales.comercio_id)
    )
  )
  with check (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
        and public.auth_can_manage_comercio(sales.comercio_id)
    )
  );

drop policy if exists "operate_messages" on public.messages;
create policy "operate_messages" on public.messages
  for all to authenticated
  using (public.auth_can_manage_comercio(comercio_id))
  with check (public.auth_can_manage_comercio(comercio_id));

drop policy if exists "operate_profiles" on public.profiles;
create policy "operate_profiles" on public.profiles
  for select to authenticated
  using (
    public.auth_profile_role() = 'super_super_admin'
    or public.auth_can_manage_comercio(comercio_id)
  );

drop policy if exists "operate_profiles_update" on public.profiles;
create policy "operate_profiles_update" on public.profiles
  for update to authenticated
  using (
    public.auth_profile_role() = 'super_super_admin'
    or (
      role in ('admin', 'empleado')
      and public.auth_can_manage_comercio(comercio_id)
    )
  )
  with check (
    public.auth_profile_role() = 'super_super_admin'
    or (
      role in ('admin', 'empleado')
      and public.auth_can_manage_comercio(comercio_id)
    )
  );
