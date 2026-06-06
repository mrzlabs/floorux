create or replace function public.auth_profile_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and deleted_at is null
$$;

create or replace function public.auth_comercio_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select comercio_id
  from public.profiles
  where id = auth.uid()
    and deleted_at is null
$$;

create or replace function public.auth_owns_comercio(target_comercio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.comercios
    where id = target_comercio_id
      and super_admin_id = auth.uid()
  )
$$;

revoke all on function public.auth_profile_role() from public;
revoke all on function public.auth_comercio_id() from public;
revoke all on function public.auth_owns_comercio(uuid) from public;

grant execute on function public.auth_profile_role() to authenticated;
grant execute on function public.auth_comercio_id() to authenticated;
grant execute on function public.auth_owns_comercio(uuid) to authenticated;

drop policy if exists "ssa_all" on public.profiles;
drop policy if exists "sa_read" on public.profiles;
drop policy if exists "admin_read" on public.profiles;
drop policy if exists "self_update" on public.profiles;

create policy "profiles_read" on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.auth_profile_role() = 'super_super_admin'
    or (
      public.auth_profile_role() = 'super_admin'
      and (
        super_admin_id = auth.uid()
        or public.auth_owns_comercio(comercio_id)
      )
    )
    or (
      public.auth_profile_role() = 'admin'
      and comercio_id = public.auth_comercio_id()
    )
  );

create policy "profiles_ssa_all" on public.profiles
  for all
  to authenticated
  using (public.auth_profile_role() = 'super_super_admin')
  with check (public.auth_profile_role() = 'super_super_admin');

create policy "profiles_self_update" on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
