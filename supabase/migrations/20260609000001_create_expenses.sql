create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  fecha date not null,
  tipo_gasto text not null check (length(trim(tipo_gasto)) > 0),
  valor numeric not null check (valor > 0),
  observacion text,
  evidencia_path text not null,
  evidencia_nombre text not null,
  evidencia_tipo text not null
    check (evidencia_tipo in ('image/jpeg', 'image/png', 'application/pdf')),
  usuario_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create index if not exists expenses_comercio_fecha_idx
  on public.expenses(comercio_id, fecha desc, created_at desc);

create index if not exists expenses_usuario_fecha_idx
  on public.expenses(usuario_id, fecha desc, created_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or (
      public.auth_profile_role() in ('admin', 'super_admin', 'super_super_admin')
      and public.auth_can_manage_comercio(comercio_id)
    )
  );

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and comercio_id = public.auth_comercio_id()
    and public.auth_profile_role() in ('admin', 'empleado')
  );

drop policy if exists "expenses_operate_insert" on public.expenses;
create policy "expenses_operate_insert" on public.expenses
  for insert to authenticated
  with check (
    public.auth_profile_role() in ('super_admin', 'super_super_admin')
    and usuario_id = auth.uid()
    and public.auth_can_manage_comercio(comercio_id)
  );

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update to authenticated
  using (
    usuario_id = auth.uid()
    or (
      public.auth_profile_role() in ('admin', 'super_admin', 'super_super_admin')
      and public.auth_can_manage_comercio(comercio_id)
    )
  )
  with check (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

create or replace function public.audit_expense_change()
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
    case when tg_op = 'INSERT' then 'CREATE' else 'UPDATE' end,
    'expenses',
    new.id,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists expenses_audit on public.expenses;
create trigger expenses_audit
  after insert or update on public.expenses
  for each row execute function public.audit_expense_change();

insert into storage.buckets (id, name, public)
values ('expense-evidence', 'expense-evidence', false)
on conflict (id) do update set public = false;

drop policy if exists "expense_evidence_insert" on storage.objects;
create policy "expense_evidence_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'expense-evidence'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (
      (storage.foldername(name))[1] = public.auth_comercio_id()::text
      or public.auth_can_manage_comercio(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "expense_evidence_select" on storage.objects;
create policy "expense_evidence_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'expense-evidence'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or (
        public.auth_profile_role() in ('admin', 'super_admin', 'super_super_admin')
        and public.auth_can_manage_comercio(((storage.foldername(name))[1])::uuid)
      )
    )
  );

drop policy if exists "expense_evidence_delete_failed_upload" on storage.objects;
create policy "expense_evidence_delete_failed_upload" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'expense-evidence'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

