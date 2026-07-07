-- ============================================================
-- BACKFILL — copia settings existente hacia tablas/columnas dedicadas
-- Ejecutar manualmente en el SQL Editor de Supabase Dashboard,
-- únicamente DESPUÉS de aplicar 20260707000001, 20260707000002 y
-- 20260707000003 (dependen de las tablas/columnas que crean).
-- ============================================================

-- tableLayout -> mesa_layouts
insert into public.mesa_layouts (mesa_id, comercio_id, x, y, w, h, shape)
select
  m.id,
  m.comercio_id,
  coalesce((layout.value->>'x')::numeric, 0),
  coalesce((layout.value->>'y')::numeric, 0),
  coalesce((layout.value->>'w')::numeric, 150),
  coalesce((layout.value->>'h')::numeric, 116),
  coalesce(layout.value->>'shape', 'rect')
from public.comercios c
join public.mesas m on m.comercio_id = c.id
cross join lateral jsonb_each(coalesce(c.settings->'tableLayout', '{}'::jsonb)) as layout(key, value)
where layout.key = m.id::text
on conflict (mesa_id) do nothing;

-- commercial / electronicInvoice -> columnas dedicadas
update public.comercios
set commercial_settings = coalesce(settings->'commercial', '{}'::jsonb),
    invoice_settings = coalesce(settings->'electronicInvoice', '{}'::jsonb)
where settings ? 'commercial' or settings ? 'electronicInvoice';

-- publicCrm.customers -> public_customers
insert into public.public_customers (comercio_id, name, email, phone, birthday, visits, total_spent, last_login, created_at)
select
  c.id,
  cust.value->>'name',
  lower(cust.value->>'email'),
  nullif(cust.value->>'phone', ''),
  nullif(cust.value->>'birthday', ''),
  coalesce((cust.value->>'visits')::int, 0),
  coalesce((cust.value->>'total_spent')::numeric, 0),
  nullif(cust.value->>'last_login', '')::timestamptz,
  coalesce(nullif(cust.value->>'created_at', '')::timestamptz, now())
from public.comercios c
cross join lateral jsonb_array_elements(coalesce(c.settings#>'{publicCrm,customers}', '[]'::jsonb)) as cust(value)
where cust.value->>'email' is not null
on conflict (comercio_id, email) do nothing;

-- publicCrm.reservations -> public_reservations
insert into public.public_reservations (comercio_id, customer_id, name, email, phone, date, time, party_size, notes, status, created_at)
select
  c.id,
  pc.id,
  res.value->>'name',
  lower(res.value->>'email'),
  nullif(res.value->>'phone', ''),
  res.value->>'date',
  res.value->>'time',
  coalesce((res.value->>'party_size')::int, 1),
  nullif(res.value->>'notes', ''),
  coalesce(res.value->>'status', 'solicitada'),
  coalesce(nullif(res.value->>'created_at', '')::timestamptz, now())
from public.comercios c
cross join lateral jsonb_array_elements(coalesce(c.settings#>'{publicCrm,reservations}', '[]'::jsonb)) as res(value)
left join public.public_customers pc
  on pc.comercio_id = c.id and pc.email = lower(res.value->>'email')
where res.value->>'email' is not null;
