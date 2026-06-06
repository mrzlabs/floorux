drop policy if exists "ssa_all_comercios" on public.comercios;
drop policy if exists "sa_own_comercios" on public.comercios;
drop policy if exists "admin_own_comercio" on public.comercios;
drop policy if exists "admin_update_comercio" on public.comercios;
drop policy if exists "comercios_select" on public.comercios;
drop policy if exists "comercios_insert" on public.comercios;
drop policy if exists "comercios_update" on public.comercios;
drop policy if exists "comercios_delete" on public.comercios;

create policy "comercios_select" on public.comercios
  for select to authenticated
  using (
    public.auth_profile_role() = 'super_super_admin'
    or super_admin_id = auth.uid()
    or id = public.auth_comercio_id()
  );

create policy "comercios_insert" on public.comercios
  for insert to authenticated
  with check (
    public.auth_profile_role() = 'super_super_admin'
    or (
      public.auth_profile_role() = 'super_admin'
      and super_admin_id = auth.uid()
    )
  );

create policy "comercios_update" on public.comercios
  for update to authenticated
  using (
    public.auth_profile_role() = 'super_super_admin'
    or super_admin_id = auth.uid()
    or id = public.auth_comercio_id()
  )
  with check (
    public.auth_profile_role() = 'super_super_admin'
    or super_admin_id = auth.uid()
    or id = public.auth_comercio_id()
  );

create policy "comercios_delete" on public.comercios
  for delete to authenticated
  using (
    public.auth_profile_role() = 'super_super_admin'
    or super_admin_id = auth.uid()
  );
