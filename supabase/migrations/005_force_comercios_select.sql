drop policy if exists "ssa_all_comercios" on public.comercios;
drop policy if exists "sa_own_comercios" on public.comercios;
drop policy if exists "admin_own_comercio" on public.comercios;
drop policy if exists "admin_update_comercio" on public.comercios;
drop policy if exists "comercios_select" on public.comercios;

create policy "comercios_select"
on public.comercios
for select
to authenticated
using (
  public.auth_profile_role() = 'super_super_admin'
  or public.auth_owns_comercio(id)
  or id = public.auth_comercio_id()
);

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'comercios'
order by policyname;
