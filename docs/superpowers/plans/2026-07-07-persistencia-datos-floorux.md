# FloorUX — Bloque 1: Persistencia confiable de datos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la clase de bug donde una pantalla pisa los cambios guardados por otra en `comercios.settings` (croquis de mesas que se revierte, y pérdida real de clientes/reservas del panel público), moviendo cada concepto a su propia tabla/columna con escritura atómica por fila.

**Architecture:** `comercios.settings` (JSONB compartido) se reparte en: tabla `mesa_layouts` (una fila por mesa), columnas `comercios.commercial_settings` / `comercios.invoice_settings` (una por concepto), y tablas relacionales `public_customers` / `public_reservations` (una fila por registro). Cada pantalla pasa de "leer todo `settings` → modificar una clave → escribir todo `settings`" a operar solo sobre su propia fila/columna, así ninguna escritura puede pisar a otra.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS + Realtime), `@supabase/supabase-js`, TypeScript.

**Nota sobre pruebas:** este repo no tiene framework de tests (no hay Jest/Vitest/Playwright configurado) ni Supabase CLI local (`supabase/config.toml` no existe) — las migraciones se aplican pegando el SQL en el SQL Editor del dashboard de Supabase, tal como documenta el `README.md` del proyecto. Por eso cada tarea usa como "test": (a) `npx tsc --noEmit` para atrapar errores de tipos, (b) verificación manual vía `select` en el SQL Editor, y (c) verificación manual en `npm run dev` para los flujos de UI. No se introduce un framework de testing nuevo en este plan — es una decisión aparte que no se está tomando aquí.

---

### Task 1: Tabla `mesa_layouts` con RLS y realtime

**Files:**
- Create: `supabase/migrations/20260707000001_mesa_layouts.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- ============================================================
-- MESA_LAYOUTS — croquis de mesas, una fila por mesa
-- ============================================================
create table public.mesa_layouts (
  mesa_id     uuid primary key references public.mesas(id) on delete cascade,
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  x           numeric not null default 0,
  y           numeric not null default 0,
  w           numeric not null default 150,
  h           numeric not null default 116,
  shape       text not null default 'rect',
  updated_at  timestamptz not null default now()
);

create trigger mesa_layouts_updated_at before update on public.mesa_layouts
  for each row execute function set_updated_at();

alter table public.mesa_layouts enable row level security;

create policy "mesa_layouts_same_comercio" on public.mesa_layouts
  for all to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  )
  with check (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

alter publication supabase_realtime add table public.mesa_layouts;
```

- [ ] **Step 2: Aplicar en Supabase**

Pegar el contenido del archivo en el SQL Editor del proyecto de Supabase (mismo flujo que documenta `README.md`) y ejecutar. Debe correr sin errores.

- [ ] **Step 3: Verificar estructura**

En el SQL Editor:

```sql
select table_name from information_schema.tables where table_name = 'mesa_layouts';
select policyname from pg_policies where tablename = 'mesa_layouts';
```

Esperado: la tabla existe y aparece la policy `mesa_layouts_same_comercio`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260707000001_mesa_layouts.sql
git commit -m "feat(db): tabla mesa_layouts con RLS y realtime"
```

---

### Task 2: Columnas dedicadas `commercial_settings` / `invoice_settings`

**Files:**
- Create: `supabase/migrations/20260707000002_comercio_dedicated_settings.sql`

- [ ] **Step 1: Escribir la migración**

```sql
alter table public.comercios
  add column if not exists commercial_settings jsonb not null default '{}'::jsonb,
  add column if not exists invoice_settings jsonb not null default '{}'::jsonb;
```

- [ ] **Step 2: Aplicar en Supabase**

Pegar y ejecutar en el SQL Editor.

- [ ] **Step 3: Verificar**

```sql
select column_name from information_schema.columns
where table_name = 'comercios' and column_name in ('commercial_settings', 'invoice_settings');
```

Esperado: ambas columnas listadas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260707000002_comercio_dedicated_settings.sql
git commit -m "feat(db): columnas commercial_settings e invoice_settings en comercios"
```

---

### Task 3: Tablas `public_customers` y `public_reservations`

**Files:**
- Create: `supabase/migrations/20260707000003_public_crm_tables.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- ============================================================
-- PUBLIC_CUSTOMERS — clientes registrados desde el panel público
-- ============================================================
create table public.public_customers (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  birthday    text,
  visits      int not null default 0,
  total_spent numeric not null default 0,
  last_login  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (comercio_id, email)
);

create trigger public_customers_updated_at before update on public.public_customers
  for each row execute function set_updated_at();

alter table public.public_customers enable row level security;

create policy "public_customers_admin_read" on public.public_customers
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );

-- Sin policy de insert/update para authenticated/anon: el endpoint público
-- (app/api/public/local/[comercioId]/route.ts) escribe exclusivamente con
-- el cliente admin (service role), que ignora RLS por diseño.

-- ============================================================
-- PUBLIC_RESERVATIONS — reservas solicitadas desde el panel público
-- ============================================================
create table public.public_reservations (
  id          uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references public.comercios(id) on delete cascade,
  customer_id uuid references public.public_customers(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  date        text not null,
  time        text not null,
  party_size  int not null,
  notes       text,
  status      text not null default 'solicitada' check (status in ('solicitada','confirmada','cancelada')),
  created_at  timestamptz not null default now()
);

alter table public.public_reservations enable row level security;

create policy "public_reservations_admin_read" on public.public_reservations
  for select to authenticated
  using (
    comercio_id = public.auth_comercio_id()
    or public.auth_can_manage_comercio(comercio_id)
  );
```

- [ ] **Step 2: Aplicar en Supabase**

Pegar y ejecutar en el SQL Editor.

- [ ] **Step 3: Verificar**

```sql
select table_name from information_schema.tables
where table_name in ('public_customers', 'public_reservations');
```

Esperado: ambas tablas listadas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260707000003_public_crm_tables.sql
git commit -m "feat(db): tablas public_customers y public_reservations"
```

---

### Task 4: Backfill de datos existentes desde `settings`

**Files:**
- Create: `supabase/migrations/20260707000004_backfill_settings_split.sql`

- [ ] **Step 1: Escribir la migración de backfill**

```sql
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
```

- [ ] **Step 2: Aplicar en Supabase**

Pegar y ejecutar en el SQL Editor **después** de las Tasks 1-3 (depende de que las tablas/columnas ya existan).

- [ ] **Step 3: Verificar conteos**

```sql
select
  (select count(*) from public.mesa_layouts) as layouts,
  (select count(*) from public.public_customers) as customers,
  (select count(*) from public.public_reservations) as reservations;
```

Comparar contra lo que había en `settings` antes de migrar (si algún comercio tenía clientes/reservas de prueba, deben aparecer aquí).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260707000004_backfill_settings_split.sql
git commit -m "feat(db): backfill de settings hacia tablas/columnas dedicadas"
```

---

### Task 5: Actualizar tipos compartidos

**Files:**
- Modify: `src/types/db.ts:21-46`

- [ ] **Step 1: Agregar los campos nuevos a `Comercio` y el tipo `MesaLayout`**

En `src/types/db.ts`, dentro de la interfaz `Comercio` (después de la línea `settings: Record<string, unknown>;`), agregar:

```typescript
  commercial_settings: Record<string, unknown>;
  invoice_settings: Record<string, unknown>;
```

Y agregar, después de la interfaz `Mesa` (línea 121), un tipo nuevo. Se llama `MesaLayoutRow` (no `MesaLayout`) a propósito: `MesaFloorPlan.tsx` ya tiene su propia interfaz local `MesaLayout` con solo `{x,y,w,h,shape}` (sin `mesa_id`/`comercio_id`); este tipo nuevo representa la fila cruda de la tabla `mesa_layouts` y no debe confundirse ni reemplazar esa interfaz local:

```typescript
export interface MesaLayoutRow {
  mesa_id: string;
  comercio_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `db.ts` (puede haber errores preexistentes no relacionados; confirmar que no aumentan).

- [ ] **Step 3: Commit**

```bash
git add src/types/db.ts
git commit -m "feat(types): agregar commercial_settings, invoice_settings y MesaLayout"
```

---

### Task 6: Migrar `MesaFloorPlan.tsx` a `mesa_layouts`

**Files:**
- Modify: `src/components/mesas/MesaFloorPlan.tsx`

- [ ] **Step 1: Quitar el estado `settings` (ya no se necesita)**

Eliminar la línea 79 (`const [settings, setSettings] = useState<Record<string, unknown>>({});`).

- [ ] **Step 2: Reemplazar el efecto de carga + canal realtime (líneas 90-127)**

Reemplazar todo el bloque `useEffect` que va desde `useEffect(() => {\n    let alive = true;` (línea 90) hasta el `}, [comercioId, supabase]);` que le sigue (línea 127) por:

```tsx
  useEffect(() => {
    let alive = true;

    async function loadLayout() {
      const { data } = await supabase
        .from('mesa_layouts')
        .select('mesa_id, x, y, w, h, shape')
        .eq('comercio_id', comercioId);

      if (!alive) return;
      const next: Record<string, MesaLayout> = {};
      (data ?? []).forEach(row => {
        next[row.mesa_id] = { x: row.x, y: row.y, w: row.w, h: row.h, shape: row.shape as MesaLayout['shape'] };
      });
      setLayout(next);
    }

    loadLayout();

    const channel = supabase
      .channel(`mesa-floor-plan:${comercioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mesa_layouts',
        filter: `comercio_id=eq.${comercioId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as { mesa_id: string };
          setLayout(prev => {
            const next = { ...prev };
            delete next[oldRow.mesa_id];
            return next;
          });
          return;
        }
        const row = payload.new as { mesa_id: string; x: number; y: number; w: number; h: number; shape: string };
        setLayout(prev => ({
          ...prev,
          [row.mesa_id]: { x: row.x, y: row.y, w: row.w, h: row.h, shape: row.shape as MesaLayout['shape'] },
        }));
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [comercioId, supabase]);
```

- [ ] **Step 3: Persistir también las mesas sin layout (líneas 129-140)**

Reemplazar el `useEffect` de "missing" por:

```tsx
  useEffect(() => {
    const missing = mesas.filter(mesa => !layout[mesa.id]);
    if (!missing.length) return;

    const additions: Record<string, MesaLayout> = {};
    missing.forEach((mesa) => {
      additions[mesa.id] = defaultLayout(mesas.findIndex(m => m.id === mesa.id));
    });

    setLayout(current => ({ ...current, ...additions }));
    void supabase
      .from('mesa_layouts')
      .upsert(
        Object.entries(additions).map(([mesa_id, entry]) => ({ mesa_id, comercio_id: comercioId, ...entry })),
        { onConflict: 'mesa_id' }
      );
  }, [mesas, layout, comercioId, supabase]);
```

- [ ] **Step 4: Reemplazar `saveLayout`/`patchMesa`/`endDrag`/`resetLayout` (líneas 142-207)**

Reemplazar todo el bloque desde `async function saveLayout` hasta el final de `resetLayout` (antes de `const selected = ...`) por:

```tsx
  async function saveMesaLayout(id: string, entry: MesaLayout) {
    setSaving(true);
    await supabase
      .from('mesa_layouts')
      .upsert({ mesa_id: id, comercio_id: comercioId, ...entry }, { onConflict: 'mesa_id' });
    setSaving(false);
  }

  function patchMesa(id: string, patch: Partial<MesaLayout>, persist = true) {
    const nextEntry = { ...(layoutRef.current[id] ?? defaultLayout(mesas.findIndex(m => m.id === id))), ...patch };
    setLayout(current => ({ ...current, [id]: nextEntry }));
    if (persist) void saveMesaLayout(id, nextEntry);
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>, mesa: T) {
    if (!editMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { id: mesa.id, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const plan = planRef.current;
    if (!drag || !plan) return;

    const rect = plan.getBoundingClientRect();
    const scaleX = PLAN_W / rect.width;
    const scaleY = PLAN_H / rect.height;
    const current = layout[drag.id] ?? defaultLayout(0);
    const x = clamp((event.clientX - rect.left - drag.dx) * scaleX, 0, PLAN_W - current.w);
    const y = clamp((event.clientY - rect.top - drag.dy) * scaleY, 0, PLAN_H - current.h);
    setLayout(prev => ({ ...prev, [drag.id]: { ...current, x, y } }));
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const entry = layoutRef.current[drag.id];
    if (entry) void saveMesaLayout(drag.id, entry);
  }

  function setSize(size: 'sm' | 'md' | 'lg') {
    if (!selectedId) return;
    const sizes = {
      sm: { w: 130, h: 104 },
      md: { w: 158, h: 120 },
      lg: { w: 210, h: 146 },
    };
    patchMesa(selectedId, sizes[size]);
  }

  async function resetLayout() {
    const next = Object.fromEntries(mesas.map((mesa, index) => [mesa.id, defaultLayout(index)]));
    setLayout(next);
    setSaving(true);
    await supabase
      .from('mesa_layouts')
      .upsert(
        mesas.map((mesa, index) => ({ mesa_id: mesa.id, comercio_id: comercioId, ...defaultLayout(index) })),
        { onConflict: 'mesa_id' }
      );
    setSaving(false);
  }
```

Nota: `startDrag`, `moveDrag` y `setSize` quedan igual que antes — se incluyen completos arriba solo para que el rango de reemplazo sea inequívoco (todo el bloque entre el viejo `saveLayout` y el viejo `resetLayout`).

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en `MesaFloorPlan.tsx`.

- [ ] **Step 6: Verificación manual en dev**

Run: `npm run dev`, entrar como admin a "Mesas", activar "Editar croquis", arrastrar una mesa a una nueva posición, refrescar la página (F5) completa.
Expected: la mesa aparece en la posición nueva, no se revierte.

- [ ] **Step 7: Commit**

```bash
git add src/components/mesas/MesaFloorPlan.tsx
git commit -m "fix(mesas): persistir croquis en mesa_layouts en vez de comercios.settings"
```

---

### Task 7: Migrar `AdminPerfil.tsx` a columnas/tablas dedicadas

**Files:**
- Modify: `src/components/admin/AdminPerfil.tsx`

- [ ] **Step 1: Quitar `settingsState` y `getPublicCrm`, agregar conteos por tabla**

Eliminar la función `getPublicCrm` (líneas 127-133) y la línea `const [settingsState, setSettingsState] = useState<Record<string, unknown>>(comercio.settings ?? {});` (línea 139).

Reemplazar las líneas:
```tsx
  const [commercial, setCommercial] = useState<CommercialSettings>(() => getCommercial(settingsState));
  const [invoice, setInvoice] = useState<ElectronicInvoiceSettings>(() => getInvoice(settingsState));
```
por:
```tsx
  const [commercial, setCommercial] = useState<CommercialSettings>(() => getCommercial(comercio.commercial_settings));
  const [invoice, setInvoice] = useState<ElectronicInvoiceSettings>(() => getInvoice(comercio.invoice_settings));
  const [crmCounts, setCrmCounts] = useState({ customers: 0, reservations: 0 });
```

Y reemplazar la línea `const publicCrm = getPublicCrm(settingsState);` por un efecto de carga (agregarlo justo después de la declaración de `qrUrl`):
```tsx
  useEffect(() => {
    let alive = true;
    async function loadCrmCounts() {
      const [{ count: customers }, { count: reservations }] = await Promise.all([
        supabase.from('public_customers').select('*', { count: 'exact', head: true }).eq('comercio_id', comercio.id),
        supabase.from('public_reservations').select('*', { count: 'exact', head: true }).eq('comercio_id', comercio.id),
      ]);
      if (alive) setCrmCounts({ customers: customers ?? 0, reservations: reservations ?? 0 });
    }
    loadCrmCounts();
    return () => { alive = false; };
  }, [comercio.id, supabase]);
```

- [ ] **Step 2: Actualizar el JSX que usaba `publicCrm`**

Reemplazar `{publicCrm.customers.length}` por `{crmCounts.customers}` y `{publicCrm.reservations.length}` por `{crmCounts.reservations}` (dentro de la sección "Link y QR del cliente").

- [ ] **Step 3: Reescribir `persistCommercial` y `persistInvoice`**

Reemplazar:
```tsx
  async function persistCommercial(nextCommercial: CommercialSettings) {
    const settings = {
      ...settingsState,
      commercial: nextCommercial,
    };
    const { error } = await supabase.from('comercios').update({ settings }).eq('id', comercio.id);
    if (error) return error;
    setSettingsState(settings);
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, settings } }));
    return null;
  }
```
por:
```tsx
  async function persistCommercial(nextCommercial: CommercialSettings) {
    const { error } = await supabase.from('comercios').update({ commercial_settings: nextCommercial }).eq('id', comercio.id);
    if (error) return error;
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, commercial_settings: nextCommercial } }));
    return null;
  }
```

Y reemplazar:
```tsx
  async function persistInvoice(nextInvoice: ElectronicInvoiceSettings) {
    const settings = {
      ...settingsState,
      electronicInvoice: nextInvoice,
    };
    const { error } = await supabase.from('comercios').update({ settings }).eq('id', comercio.id);
    if (error) return error;
    setSettingsState(settings);
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, settings } }));
    return null;
  }
```
por:
```tsx
  async function persistInvoice(nextInvoice: ElectronicInvoiceSettings) {
    const { error } = await supabase.from('comercios').update({ invoice_settings: nextInvoice }).eq('id', comercio.id);
    if (error) return error;
    window.dispatchEvent(new CustomEvent('floorux:commerce-updated', { detail: { id: comercio.id, invoice_settings: nextInvoice } }));
    return null;
  }
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en `AdminPerfil.tsx`.

- [ ] **Step 5: Verificación manual en dev**

Run: `npm run dev`, entrar a "Mi local" como admin, cambiar un dato de "Canales e impulso comercial", guardar, refrescar, confirmar que el dato persiste y que "Clientes"/"Reservas" del panel de QR siguen mostrando el conteo correcto.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminPerfil.tsx
git commit -m "fix(perfil): persistir comercial/facturacion en columnas dedicadas"
```

---

### Task 8: Migrar el endpoint público y `PublicLocalPanel.tsx`

**Files:**
- Modify: `src/app/api/public/local/[comercioId]/route.ts`
- Modify: `src/app/local/[comercioId]/page.tsx`
- Modify: `src/components/public/PublicLocalPanel.tsx`

- [ ] **Step 1: Reescribir `route.ts`**

Reemplazar todo el contenido del archivo por:

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const registerSchema = z.object({
  type: z.literal('register'),
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().default(''),
  birthday: z.string().max(20).optional().default(''),
});

const loginSchema = z.object({
  type: z.literal('login'),
  email: z.string().email().max(160),
});

const reservationSchema = z.object({
  type: z.literal('reservation'),
  customerId: z.string().optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().default(''),
  date: z.string().min(8).max(20),
  time: z.string().min(3).max(12),
  partySize: z.number().int().min(1).max(80),
  notes: z.string().max(600).optional().default(''),
});
type ReservationInput = z.infer<typeof reservationSchema>;

export async function GET(_: NextRequest, { params }: { params: { comercioId: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('comercios')
    .select('id, name, type, city, address, phone, color, photo_url, commercial_settings, status')
    .eq('id', params.comercioId)
    .maybeSingle();

  if (error || !data || data.status !== 'activo') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    comercio: {
      id: data.id,
      name: data.name,
      type: data.type,
      city: data.city,
      address: data.address,
      phone: data.phone,
      color: data.color,
      photo_url: data.photo_url,
      commercial: data.commercial_settings ?? {},
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: { comercioId: string } }) {
  const admin = createAdminClient();
  const body = await req.json();
  const parsed = z.discriminatedUnion('type', [registerSchema, loginSchema, reservationSchema]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const { data: comercio, error } = await admin
    .from('comercios')
    .select('id, status')
    .eq('id', params.comercioId)
    .maybeSingle();

  if (error || !comercio || comercio.status !== 'activo') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (parsed.data.type === 'login') {
    const { data: customer } = await admin
      .from('public_customers')
      .select('*')
      .eq('comercio_id', params.comercioId)
      .eq('email', parsed.data.email.toLowerCase())
      .maybeSingle();
    if (!customer) return NextResponse.json({ error: 'not_registered' }, { status: 404 });
    return NextResponse.json({ customer });
  }

  const now = new Date().toISOString();

  if (parsed.data.type === 'register') {
    const { data: customer, error: upsertError } = await admin
      .from('public_customers')
      .upsert({
        comercio_id: params.comercioId,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        birthday: parsed.data.birthday,
        last_login: now,
      }, { onConflict: 'comercio_id,email' })
      .select()
      .single();
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    return NextResponse.json({ customer });
  }

  const reservationData = parsed.data as ReservationInput;

  const { data: customer, error: customerError } = await admin
    .from('public_customers')
    .upsert({
      comercio_id: params.comercioId,
      name: reservationData.name,
      email: reservationData.email.toLowerCase(),
      phone: reservationData.phone,
      last_login: now,
    }, { onConflict: 'comercio_id,email' })
    .select()
    .single();
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });

  const { data: reservation, error: reservationError } = await admin
    .from('public_reservations')
    .insert({
      comercio_id: params.comercioId,
      customer_id: customer.id,
      name: reservationData.name,
      email: reservationData.email.toLowerCase(),
      phone: reservationData.phone,
      date: reservationData.date,
      time: reservationData.time,
      party_size: reservationData.partySize,
      notes: reservationData.notes,
    })
    .select()
    .single();
  if (reservationError) return NextResponse.json({ error: reservationError.message }, { status: 500 });

  return NextResponse.json({ reservation, customer });
}
```

- [ ] **Step 2: Actualizar `page.tsx`**

En `src/app/local/[comercioId]/page.tsx`, cambiar:
```tsx
    .select('id, name, type, city, address, phone, color, photo_url, settings, status')
```
por:
```tsx
    .select('id, name, type, city, address, phone, color, photo_url, commercial_settings, status')
```

- [ ] **Step 3: Actualizar `PublicLocalPanel.tsx`**

Cambiar la interfaz de props (líneas 6-18): reemplazar `settings: Record<string, unknown>;` por `commercial_settings: Record<string, unknown>;`.

Cambiar la línea:
```tsx
  const commercial = useMemo(() => (comercio.settings?.commercial as Record<string, any>) ?? {}, [comercio.settings]);
```
por:
```tsx
  const commercial = useMemo(() => (comercio.commercial_settings as Record<string, any>) ?? {}, [comercio.commercial_settings]);
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en los 3 archivos modificados.

- [ ] **Step 5: Verificación manual de concurrencia**

Run: `npm run dev`. Abrir `http://localhost:3000/local/<comercioId>` en dos pestañas del navegador. Registrar dos correos **distintos** casi al mismo tiempo (uno en cada pestaña, click de "Registrarme" con menos de 1 segundo de diferencia).

Verificar en el SQL Editor de Supabase:
```sql
select email from public.public_customers where comercio_id = '<comercioId>' order by created_at desc limit 5;
```
Expected: aparecen **ambos** correos. Antes del fix, bajo esta misma prueba con el `settings` JSON compartido, uno de los dos se perdía.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/public/local/[comercioId]/route.ts src/app/local/[comercioId]/page.tsx src/components/public/PublicLocalPanel.tsx
git commit -m "fix(public): registrar clientes/reservas en tablas dedicadas sin pisar datos"
```

---

### Task 9: Limpieza final y verificación de tipos completa

**Files:**
- Modify: `README.md:150-192` (árbol de carpetas / setup, si menciona `settings` como fuente de estas features)

- [ ] **Step 1: Buscar referencias restantes a las claves migradas**

Run: `grep -rn "settings\.\(tableLayout\|commercial\|electronicInvoice\|publicCrm\)" src/`
Expected: sin resultados (todas las lecturas/escrituras de esas claves ya se movieron en las Tasks 6-8).

- [ ] **Step 2: Type-check completo del proyecto**

Run: `npx tsc --noEmit`
Expected: 0 errores nuevos respecto al estado antes de este plan.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de build relacionados a los archivos tocados.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: verificación final de persistencia migrada"
```

---

### Task 10: Reproducir y corregir el bug de la foto del comercio

Este bug no comparte la causa raíz de las Tasks 1-9 (`photo_url` es columna propia, no vive en `settings`), así que no tiene una corrección predefinida — se ataca con el flujo de depuración sistemática (skill `superpowers:systematic-debugging`) en vez de aplicar un fix supuesto.

**Files:** por determinar según lo que arroje la reproducción — candidatos probables: `src/app/(crm)/admin/AdminShell.tsx:73-116`, `src/app/(crm)/empleado/EmpShell.tsx:75-148`, `src/components/admin/AdminPerfil.tsx:199-210`.

- [ ] **Step 1: Reproducir el bug de forma dirigida**

Con `npm run dev` corriendo: entrar como admin, subir una foto del comercio en "Mi local", confirmar que se ve en el sidebar. Navegar a otra pantalla (ej. "Mesas") y volver a "Mi local" o a "Resumen". Anotar exactamente en qué paso desaparece la foto y si vuelve a aparecer con un refresh completo (F5) o si permanece ausente incluso después de recargar.

- [ ] **Step 2: Confirmar en la base de datos si el dato persiste**

En el SQL Editor de Supabase:
```sql
select id, name, photo_url, updated_at from public.comercios where id = '<comercioId>';
```
Si `photo_url` sigue teniendo la URL correcta ahí, el bug es de sincronización en el cliente (estado stale, caché de Next.js, o carrera con el canal realtime). Si `photo_url` aparece `null`, alguna escritura la está borrando — buscar con `grep -rn "update({" src/` cualquier `.update()` sobre `comercios` que no incluya `photo_url` explícitamente pero pueda estar mandando un objeto completo con esa clave en `null`.

- [ ] **Step 3: Aplicar el fix una vez identificada la causa**

Corregir el punto exacto encontrado en el Step 2 (no antes). Si es sincronización de cliente: asegurar que el componente que muestra `brandLogo`/`shopImg` lea siempre el valor más reciente (fetch fresco al montar cada pantalla, como ya hace `AdminShell.tsx:84-96`, y confirmar que `EmpShell.tsx` tenga el mismo patrón si el bug ocurre en esa vista).

- [ ] **Step 4: Verificación manual del fix**

Repetir el Step 1 (subir foto, navegar entre todas las pantallas del rol donde ocurría el bug, refrescar). Expected: la foto se mantiene visible en todo momento.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(comercio): persistencia de la foto del comercio entre paneles"
```

## Fuera de alcance de este plan (quedan para los planes de Bloque 2 y 3)

- Ampliar formas del croquis (cuadrada, ovalada, barra) y redimensionado libre — depende de `mesa_layouts` pero es trabajo de UI, no de persistencia.
- Todo el sistema de personalización (Bloque 2) y el rediseño visual/responsive (Bloque 3).
