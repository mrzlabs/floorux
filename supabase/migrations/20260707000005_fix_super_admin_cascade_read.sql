-- ============================================================
-- FIX: admins/empleados no podían leer el perfil de su propio
-- super_admin, lo que hacía fallar el chequeo de suspensión en
-- cascada del middleware (redirect a /login en cada navegación).
-- ============================================================
create or replace function public.auth_super_admin_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select super_admin_id
  from public.profiles
  where id = auth.uid()
    and deleted_at is null
$$;

revoke all on function public.auth_super_admin_id() from public;
grant execute on function public.auth_super_admin_id() to authenticated;

drop policy if exists "profiles_read" on public.profiles;

create policy "profiles_read" on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or id = public.auth_super_admin_id()
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
