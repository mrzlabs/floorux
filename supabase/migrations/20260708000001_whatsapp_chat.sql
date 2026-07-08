-- ============================================================
-- Chat WhatsApp con clientes
-- Bandeja de mensajes entrantes/salientes por comercio.
-- Ejecutar en Supabase → SQL Editor.
-- Luego habilitar Realtime en la tabla wa_messages (si la
-- sentencia final de publication falla, hacerlo desde el dashboard).
-- ============================================================

create table if not exists public.wa_contacts (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  phone       text not null,
  name        text,
  source      text not null default 'whatsapp' check (source in ('whatsapp', 'app')),
  created_at  timestamptz not null default now(),
  unique (comercio_id, phone)
);

create table if not exists public.wa_messages (
  id                uuid primary key default gen_random_uuid(),
  comercio_id       uuid not null references public.comercios(id) on delete cascade,
  contact_id        uuid not null references public.wa_contacts(id) on delete cascade,
  direction         text not null check (direction in ('in', 'out')),
  body              text not null,
  status            text not null default 'received'
    check (status in ('received', 'queued', 'sent', 'delivered', 'read', 'failed')),
  wa_message_id     text,
  sender_profile_id uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

create index if not exists wa_messages_comercio_idx on public.wa_messages (comercio_id, created_at desc);
create index if not exists wa_messages_contact_idx on public.wa_messages (contact_id, created_at);
create index if not exists wa_contacts_comercio_idx on public.wa_contacts (comercio_id, created_at desc);

alter table public.wa_contacts enable row level security;
alter table public.wa_messages enable row level security;

-- Lectura: perfiles del comercio y quien puede gestionarlo (super_admin dueño / super root)
create policy "wa_contacts_read" on public.wa_contacts
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

create policy "wa_messages_read" on public.wa_messages
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

-- Sin policies de insert/update para authenticated: el webhook de entrada
-- (api/integrations/whatsapp/webhook) y el envío de respuestas
-- (api/integrations/whatsapp/send) escriben con el cliente admin
-- (service role), que ignora RLS por diseño.

-- Realtime para la bandeja en vivo
alter publication supabase_realtime add table public.wa_messages;
alter publication supabase_realtime add table public.wa_contacts;
