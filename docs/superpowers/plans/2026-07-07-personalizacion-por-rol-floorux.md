# FloorUX — Bloque 2: Personalización por rol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo sistema de apariencia (no 3 copias casi idénticas), con selector de color libre además de paletas curadas, un botón rápido de claro/oscuro para los 4 roles, una pantalla "Apariencia" propia y separada de datos de negocio, y aplicación del tema sin parpadeo al navegar.

**Architecture:** Se extrae el bloque de tema duplicado en `AdminPerfil.tsx`, `SuperCuenta.tsx` y `SRCuenta.tsx` (mismo `ExtTheme`, `PALETAS`, `getExtTheme`, controles) a un componente controlado compartido `PanelAppearance`. Cada rol sigue dueño de su propio guardado (sin cambios de permisos), pero ahora vive en una ruta `/apariencia` propia por rol en vez de mezclado con datos de negocio. Un helper central (`applyTheme` en `useTheme.ts`) queda como único punto que aplica Y persiste el tema en una cookie, leída por un script inline en el `<head>` antes de hidratar React, eliminando el parpadeo del tema por defecto al navegar.

**Tech Stack:** Next.js 14 App Router, React (client components), Supabase (`profiles.panel_theme`), CSS custom properties.

**Nota sobre pruebas:** igual que el Bloque 1, este repo no tiene framework de tests. Verificación vía `npx tsc --noEmit`, `npm run build`, y verificación manual en `npm run dev` navegando como cada rol.

---

### Task 1: Crear el componente compartido `PanelAppearance`

**Files:**
- Create: `src/components/theme/PanelAppearance.tsx`

- [ ] **Step 1: Escribir el archivo**

```tsx
'use client';

export interface ExtTheme {
  mode: 'dark' | 'light';
  palette: string[];
  font: string;
  density: 'comfortable' | 'compact';
  radius: number;
  neuralOpacity: number;
}

export const APPEARANCE_PALETTES = [
  { name: 'Violeta',   c: ['#7F77DD', '#27C3D8', '#B57BE0'] },
  { name: 'Cobre',     c: ['#cb6015', '#e8a87c', '#7B3F00'] },
  { name: 'Esmeralda', c: ['#004D40', '#00796B', '#4DB6AC'] },
  { name: 'Zafiro',    c: ['#1A237E', '#283593', '#5C6BC0'] },
  { name: 'Rubí',      c: ['#CB2D3E', '#EF473A', '#F7971E'] },
  { name: 'Oro',       c: ['#F5C400', '#f59e42', '#E0708A'] },
  { name: 'Océano',    c: ['#0077B6', '#00B4D8', '#90E0EF'] },
  { name: 'Bosque',    c: ['#34d399', '#3b82f6', '#a78bfa'] },
];

export const APPEARANCE_FONTS = ['Plus Jakarta Sans', 'DM Sans', 'Syne', 'Outfit', 'Space Grotesk'];

export function getExtTheme(pt: Record<string, unknown>, fallback: string): ExtTheme {
  return {
    mode: pt.mode === 'light' ? 'light' : 'dark',
    palette: Array.isArray(pt.palette) && (pt.palette as unknown[]).length === 3
      ? (pt.palette as string[])
      : [fallback, '#27C3D8', '#B57BE0'],
    font: typeof pt.font === 'string' ? pt.font : 'Plus Jakarta Sans',
    density: pt.density === 'compact' ? 'compact' : 'comfortable',
    radius: typeof pt.radius === 'number' ? pt.radius : 14,
    neuralOpacity: typeof pt.neuralOpacity === 'number' ? pt.neuralOpacity : 60,
  };
}

import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';

interface PanelAppearanceProps {
  theme: ExtTheme;
  onChange: (patch: Partial<ExtTheme>) => void;
}

export function PanelAppearance({ theme, onChange }: PanelAppearanceProps) {
  const C = { fontSize: 13, color: 'var(--muted)' } as const;

  return (
    <>
      <Field label="Tema">
        <div className="theme-seg">
          <button className={theme.mode === 'dark' ? 'on' : ''} onClick={() => onChange({ mode: 'dark' })}>
            <Icon name="moon" s={15} /> Oscuro
          </button>
          <button className={theme.mode === 'light' ? 'on' : ''} onClick={() => onChange({ mode: 'light' })}>
            <Icon name="sun" s={15} /> Claro
          </button>
        </div>
      </Field>

      <Field label="Paleta de colores">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 10px' }}>
          {APPEARANCE_PALETTES.map(p => {
            const active = p.c.every((col, i) => col === theme.palette[i]);
            return (
              <div key={p.name} style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className={'swatch' + (active ? ' on' : '')}
                  style={{
                    width: 52, height: 52,
                    background: `linear-gradient(to right, ${p.c[0]} 0% 33%, ${p.c[1]} 33% 66%, ${p.c[2]} 66% 100%)`,
                    borderRadius: 12,
                  }}
                  title={p.name}
                  aria-label={p.name}
                  onClick={() => onChange({ palette: p.c })}
                />
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5, lineHeight: 1.2 }}>{p.name}</div>
              </div>
            );
          })}
        </div>
      </Field>

      <Field label="Colores personalizados">
        <div style={{ display: 'flex', gap: 16 }}>
          {(['Acento 1', 'Acento 2', 'Acento 3'] as const).map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="crm-label" style={{ fontSize: 11 }}>{label}</label>
              <input
                type="color"
                value={theme.palette[i] ?? '#7F77DD'}
                onChange={e => {
                  const nextPalette = [...theme.palette];
                  nextPalette[i] = e.target.value;
                  onChange({ palette: nextPalette });
                }}
                style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', background: 'transparent' }}
              />
            </div>
          ))}
        </div>
      </Field>

      <Field label="Tipografía">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {APPEARANCE_FONTS.map(f => (
            <button key={f} type="button"
              className={'fchip' + (theme.font === f ? ' on' : '')}
              style={{ fontFamily: `'${f}', system-ui, sans-serif`, fontSize: 13 }}
              onClick={() => onChange({ font: f })}>
              {f}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Densidad">
        <div className="theme-seg">
          <button className={theme.density === 'comfortable' ? 'on' : ''} onClick={() => onChange({ density: 'comfortable' })}>Cómodo</button>
          <button className={theme.density === 'compact' ? 'on' : ''} onClick={() => onChange({ density: 'compact' })}>Compacto</button>
        </div>
      </Field>

      <Field label={`Radio de bordes — ${theme.radius}px`}>
        <input type="range" min={4} max={24} step={1} value={theme.radius}
          onChange={e => onChange({ radius: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...C, marginTop: 4 }}>
          <span>4px</span><span>24px</span>
        </div>
      </Field>

      <Field label={`Intensidad del gradiente — ${theme.neuralOpacity}%`}>
        <input type="range" min={0} max={100} step={5} value={theme.neuralOpacity}
          onChange={e => onChange({ neuralOpacity: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...C, marginTop: 4 }}>
          <span>Sin gradiente</span><span>Máximo</span>
        </div>
      </Field>
    </>
  );
}
```

Nota: el `import` de `Icon`/`Field` en medio del archivo (después de las funciones helper) es válido en TypeScript/ESM — los imports se izan (hoisting) independientemente de dónde aparezcan en el archivo — pero por convención de estilo muévelos arriba del todo, junto a `'use client'`, antes de las declaraciones de tipos y constantes. Ajusta el orden así al escribir el archivo real (no dejes el import a mitad de archivo).

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos. Baseline tras el Bloque 1 es 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/theme/PanelAppearance.tsx
git commit -m "feat(theme): componente compartido PanelAppearance con selector de color libre"
```

Do NOT add a "Co-Authored-By" trailer or any AI/Claude attribution.

## Context

`AdminPerfil.tsx`, `SuperCuenta.tsx` y `SRCuenta.tsx` duplican casi línea por línea el mismo bloque: interfaz `ExtTheme`, función `getExtTheme`, constante `PALETAS` (las mismas 20 paletas, algunas con nombres genéricos tipo "Neón"/"Lava"/"Galaxia"/"Candy"), constante de fuentes, y los controles de Tema/Paleta/Tipografía/Densidad/Radio/Gradiente. Este componente los reemplaza a los tres. Cambios de contenido respecto a las copias viejas (parte del feedback del usuario: "se ve muy genérica" y "falta control fino"):
- Paleta curada reducida de 20 a 8 opciones con nombres más acordes a un producto de hospitalidad (se quitan Neón, Lava, Galaxia, Candy, Aurora, Fuego, Hielo, Noche, Tierra, Menta, Crepúsculo, Rosa).
- Se agrega un `<input type="color">` por acento (Acento 1/2/3) para color libre, independiente de las paletas curadas.

El componente es **controlado**: no hace fetch ni guarda nada por su cuenta. Cada pantalla que lo use sigue siendo dueña de su propio estado `theme`, su propia función `live()`/`onChange`, y su propio botón de guardar — esto preserva el comportamiento de guardado que ya existe en cada rol sin tener que unificar sus flujos de guardado (que hoy son ligeramente distintos: Admin y Super Admin tienen un botón de guardar dedicado solo al tema; Super Root guarda todo junto con un solo botón).

## Before You Begin

If anything is unclear, ask before proceeding.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, contenido final del archivo, tsc output, commit SHA, concerns.

---

### Task 2: Eliminar código muerto (`ThemeCustomizer.tsx`, `theme-access.ts`)

**Files:**
- Delete: `src/components/ThemeCustomizer.tsx`
- Delete: `src/lib/auth/theme-access.ts`

- [ ] **Step 1: Confirmar que no hay más referencias**

Run: `grep -rn "ThemeCustomizer\|theme-access\|canCustomizeTheme" src/`
Expected: solo las líneas dentro de los propios 2 archivos a borrar (ningún otro archivo los importa). Si aparece alguna otra referencia, STOP y reporta — no borres nada hasta confirmar que de verdad no se usan en ningún otro lado.

- [ ] **Step 2: Borrar los archivos**

```bash
git rm src/components/ThemeCustomizer.tsx src/lib/auth/theme-access.ts
```

- [ ] **Step 3: Verificar tipos y build**

Run: `npx tsc --noEmit` — expected sin errores.
Run: `npm run build` — expected build exitoso.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(theme): eliminar ThemeCustomizer y theme-access sin uso"
```

## Context

`ThemeCustomizer.tsx` es una versión vieja y más limitada del selector de tema (solo 3 color pickers, sin modo/tipografía/densidad), ya reemplazada hace tiempo por el bloque duplicado en `AdminPerfil.tsx`/`SuperCuenta.tsx`/`SRCuenta.tsx` — no tiene ningún import en el resto del código. `theme-access.ts` (con `canCustomizeThemeByRole`/`canCustomizeTheme`) solo lo consume `ThemeCustomizer.tsx`; el control de acceso real a la personalización ya lo hace cada `page.tsx` (ej. `super/cuenta/page.tsx` redirige si `profile.role !== 'super_admin'`), así que esta función queda huérfana también.

## Before You Begin

Si el grep del Step 1 muestra algo inesperado, no borres — reporta y pregunta.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, resultado del grep, tsc/build output, commit SHA.

---

### Task 3: FOUC — persistir tema en cookie y aplicarlo antes de hidratar

**Files:**
- Modify: `src/hooks/useTheme.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Agregar persistencia en cookie a `applyTheme`**

Reemplazar el contenido completo de `src/hooks/useTheme.ts` por:

```tsx
'use client';
import { useEffect } from 'react';

const THEME_COOKIE = 'floorux_theme';

function persistThemeCookie(mode: string, palette?: string[]) {
  if (typeof document === 'undefined') return;
  const payload = JSON.stringify({ mode, palette: palette && palette.length === 3 ? palette : undefined });
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(payload)}; path=/; max-age=31536000; samesite=lax`;
}

export function applyTheme(mode: string, palette?: string[]) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode || 'dark');
  if (palette && palette.length === 3) {
    root.style.setProperty('--accent', palette[0]);
    root.style.setProperty('--accent2', palette[1]);
    root.style.setProperty('--accent3', palette[2]);
  }
  persistThemeCookie(mode || 'dark', palette);
}

export function useTheme(mode: string, palette?: string[]) {
  useEffect(() => {
    applyTheme(mode, palette);
  }, [mode, palette?.join(',')]);
}

export function applyFullTheme(pt: Record<string, unknown>, fallbackAccent = '#7F77DD') {
  const mode = pt.mode === 'light' ? 'light' : 'dark';
  const palette = Array.isArray(pt.palette) && (pt.palette as unknown[]).length === 3
    ? pt.palette as string[]
    : [fallbackAccent, '#27C3D8', '#B57BE0'];
  applyTheme(mode, palette);

  const root = document.documentElement;

  if (typeof pt.font === 'string' && pt.font) {
    root.style.setProperty('--font', `'${pt.font}',system-ui,sans-serif`);
  }

  root.classList.toggle('compact', pt.density === 'compact');

  if (typeof pt.radius === 'number') {
    const r = pt.radius as number;
    root.style.setProperty('--r-lg', r + 'px');
    root.style.setProperty('--r-md', Math.round(r * 0.75) + 'px');
    root.style.setProperty('--r-sm', Math.round(r * 0.55) + 'px');
  }

  if (typeof pt.neuralOpacity === 'number') {
    const op = pt.neuralOpacity as number;
    root.style.setProperty('--np', Math.round(op / 100 * 26) + '%');
    root.style.setProperty('--np2', Math.round(op / 100 * 20) + '%');
  }
}
```

(Único cambio real: la función interna `persistThemeCookie` y su llamada al final de `applyTheme`. Todo lo demás es idéntico al archivo actual.)

- [ ] **Step 2: Leer la cookie antes de hidratar, en el layout raíz**

En `src/app/layout.tsx`, agregar un script inline dentro de `<head>`, antes del `<link>` de fuentes. Reemplazar:

```tsx
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
```

por:

```tsx
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )floorux_theme=([^;]*)/);if(!m)return;var t=JSON.parse(decodeURIComponent(m[1]));var r=document.documentElement;r.setAttribute('data-theme',t.mode==='light'?'light':'dark');if(Array.isArray(t.palette)&&t.palette.length===3){r.style.setProperty('--accent',t.palette[0]);r.style.setProperty('--accent2',t.palette[1]);r.style.setProperty('--accent3',t.palette[2]);}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
```

- [ ] **Step 3: Verificar tipos y build**

Run: `npx tsc --noEmit` — expected sin errores.
Run: `npm run build` — expected build exitoso.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`. Entra como cualquier rol, cambia a modo claro y guarda (o usa el toggle rápido, una vez exista tras la Task 5). Recarga la página con F5. Confirma con las DevTools (pestaña Network o simplemente observando) que el fondo correcto aparece desde el primer frame, sin destello del tema oscuro por defecto antes de corregirse.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTheme.ts src/app/layout.tsx
git commit -m "fix(theme): aplicar tema desde cookie antes de hidratar para evitar parpadeo"
```

## Context

Hoy `applyFullTheme`/`applyTheme` se llaman solo dentro de un `useEffect` en cada Shell (`AdminShell`, `SuperShell`, `SRShell`, `EmpShell`), es decir, después del primer render — por una fracción de segundo se pinta el tema por defecto (oscuro, violeta) antes de que el `useEffect` corra y lo corrija con el tema real del usuario. Esto pasa en cada navegación dura y cada recarga, y fue una queja explícita ("no se refleja bien"). La cookie es un mecanismo simple para que el HTML inicial ya sepa qué tema aplicar antes de que React siquiera hidrate — no reemplaza `profiles.panel_theme` (que sigue siendo la fuente de verdad y lo que sincroniza entre dispositivos), es solo una caché local de lectura instantánea para el primer pintado.

`suppressHydrationWarning` ya está puesto en el `<html>` de `layout.tsx` — es necesario porque este script inline modifica atributos/estilos del `<html>` antes de que React hidrate, y sin esa prop React marcaría una advertencia de mismatch. Ya estaba presente en el archivo antes de este cambio, así que no hace falta agregarlo.

## Before You Begin

Si el archivo actual de `layout.tsx` no tiene exactamente ese `<head>` (por ejemplo si cambió desde que se escribió este plan), ubica el `<head>` real y agrega el script como su primer hijo, antes de cualquier otro elemento.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, tsc/build output, resultado de la verificación manual del parpadeo, commit SHA.

---

### Task 4: Botón rápido de claro/oscuro para los 4 roles

**Files:**
- Modify: `src/app/(crm)/admin/AdminShell.tsx`
- Modify: `src/app/(crm)/super/SuperShell.tsx`
- Modify: `src/app/(crm)/super-root/SRShell.tsx`

- [ ] **Step 1: Agregarlo en `AdminShell.tsx`**

Agregar el import:
```tsx
import { ThemeModeToggle } from '@/components/theme/ThemeModeToggle';
```

En el `<Sidebar>` de `AdminShell.tsx`, agregar la prop `navFooter` (no existe hoy en este archivo):
```tsx
        navFooter={
          <ThemeModeToggle
            profileId={profile.id}
            initialMode={(profile.panel_theme as Record<string, unknown>)?.mode === 'light' ? 'light' : 'dark'}
            onModeChange={(mode) => applyFullTheme({ ...(profile.panel_theme as Record<string, unknown>), mode }, profile.color)}
          />
        }
```

- [ ] **Step 2: Agregarlo en `SuperShell.tsx`**

Agregar el mismo import. `SuperShell.tsx` ya usa `navFooter` para `usageWidget` — hay que combinar ambos en un fragmento. Reemplazar:

```tsx
        navFooter={usageWidget}
```

por:

```tsx
        navFooter={
          <>
            <ThemeModeToggle
              profileId={profile.id}
              initialMode={(profile.panel_theme as Record<string, unknown>)?.mode === 'light' ? 'light' : 'dark'}
              onModeChange={(mode) => applyFullTheme({ ...(profile.panel_theme as Record<string, unknown>), mode }, profile.color)}
            />
            {usageWidget}
          </>
        }
```

- [ ] **Step 3: Agregarlo en `SRShell.tsx`**

Agregar el mismo import. `SRShell.tsx` no usa `navFooter` hoy. Agregar la prop al `<Sidebar>`:

```tsx
        navFooter={
          <ThemeModeToggle
            profileId={profile.id}
            initialMode={pt.mode === 'light' ? 'light' : 'dark'}
            onModeChange={(mode) => applyFullTheme({ ...pt, mode }, '#B57BE0')}
          />
        }
```

(`pt` ya existe como variable en este archivo — es `profile.panel_theme as Record<string, unknown>`, declarada al inicio del componente.)

- [ ] **Step 4: Verificar tipos y build**

Run: `npx tsc --noEmit` — expected sin errores.
Run: `npm run build` — expected build exitoso.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev`. Entra como admin, super_admin y super_root (3 sesiones/roles distintos) y confirma que el botón de claro/oscuro aparece en el pie del sidebar de las 3 vistas, igual que ya existe para empleado, y que al hacer clic cambia el tema inmediatamente.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(crm)/admin/AdminShell.tsx" "src/app/(crm)/super/SuperShell.tsx" "src/app/(crm)/super-root/SRShell.tsx"
git commit -m "feat(theme): boton rapido de claro/oscuro para admin, super admin y super root"
```

## Context

`ThemeModeToggle` (en `src/components/theme/ThemeModeToggle.tsx`) ya existe, ya persiste `profiles.panel_theme.mode` por su cuenta vía Supabase, y ya se usa hoy únicamente en `EmpShell.tsx` (pie del sidebar). Es reutilizable tal cual — no requiere cambios. Esta tarea solo lo conecta a las otras 3 vistas para que el acceso rápido sea consistente en los 4 roles, en vez de que Admin/Super Admin/Super Root tengan que ir hasta su pantalla de "Apariencia" (Task 6) para cambiar el modo.

## Before You Begin

Si algún Shell no tiene exactamente las líneas descritas (por ejemplo si cambiaron desde que se escribió este plan), ubica el `<Sidebar>` real de ese archivo y agrega `navFooter` ahí, preservando cualquier otro prop existente.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs de los 3 archivos, tsc/build output, resultado de la verificación manual, commit SHA.

---

### Task 5: Pantalla "Apariencia" propia para Admin

**Files:**
- Create: `src/app/(crm)/admin/apariencia/page.tsx`
- Create: `src/components/admin/AdminApariencia.tsx`
- Modify: `src/app/(crm)/admin/AdminShell.tsx`
- Modify: `src/components/admin/AdminPerfil.tsx`

- [ ] **Step 1: Crear `AdminApariencia.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastContext';
import { applyFullTheme } from '@/hooks/useTheme';
import { PanelAppearance, getExtTheme, type ExtTheme } from '@/components/theme/PanelAppearance';
import type { Profile } from '@/types/db';

interface AdminAparienciaProps {
  profile: Profile;
}

export function AdminApariencia({ profile }: AdminAparienciaProps) {
  const toast = useToast();
  const supabase = createClient();
  const [theme, setTheme] = useState<ExtTheme>(() => getExtTheme(profile.panel_theme as Record<string, unknown>, profile.color));
  const [saving, setSaving] = useState(false);

  function live(patch: Partial<ExtTheme>) {
    const next = { ...theme, ...patch };
    setTheme(next);
    applyFullTheme(next as Record<string, unknown>, profile.color);
  }

  async function saveTheme() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      panel_theme: { ...(profile.panel_theme as Record<string, unknown>), ...theme },
      color: theme.palette[0],
    }).eq('id', profile.id);
    setSaving(false);
    if (error) { toast('No se pudo guardar las preferencias', 'alert'); return; }
    toast('Preferencias guardadas', 'check');
  }

  return (
    <div className="card" style={{ padding: 20, maxWidth: 640 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Apariencia de mi panel</h2>
      <PanelAppearance theme={theme} onChange={live} />
      <button className="btn pri block" style={{ marginTop: 18 }} onClick={saveTheme} disabled={saving}>
        <Icon name="check" /> {saving ? 'Guardando…' : 'Guardar preferencias'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Crear la página**

```tsx
import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { AdminApariencia } from '@/components/admin/AdminApariencia';

export default async function AdminAparienciaPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  if (!comercio) redirect('/login');
  return (
    <AdminShell profile={profile} comercio={comercio} view="apariencia" operating={operating} returnPath={returnPath}>
      <AdminApariencia profile={profile} />
    </AdminShell>
  );
}
```

- [ ] **Step 3: Agregar el ítem de navegación en `AdminShell.tsx`**

En el array `nav` de `AdminShell.tsx`, agregar una entrada antes de `perfil`:

```tsx
    { href: '/admin/apariencia', label: 'Apariencia', icon: 'spark', title: 'Apariencia', sub: 'Tema y colores de tu panel' },
```

(`icon: 'spark'` ya se usa en otras partes del código para íconos de personalización/branding — verifica que `Icon` soporte ese nombre; si no, usa `'edit'` en su lugar.)

- [ ] **Step 4: Quitar la sección de apariencia de `AdminPerfil.tsx`**

Eliminar por completo el bloque `{/* ─── APARIENCIA PERSONAL ────────────────────────── */}` (la tarjeta "Mi panel — apariencia personal" con Tema/Paleta/Tipografía/Densidad/Radio/Gradiente y su botón "Guardar preferencias"), junto con el estado `theme`/`savingTheme`, la función `saveTheme`, la función `live`, la interfaz `ExtTheme`, la función `getExtTheme`, y las constantes `PALETAS`/`FUENTES` — todo eso ahora vive en `PanelAppearance.tsx` / `AdminApariencia.tsx`. Mantén todo lo demás del archivo intacto (perfil personal, datos del local, comercial, facturación, QR, soporte).

- [ ] **Step 5: Verificar tipos y build**

Run: `npx tsc --noEmit` — expected sin errores.
Run: `npm run build` — expected build exitoso, la ruta `/admin/apariencia` debe aparecer en el listado de rutas.

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`. Entra como admin, ve a "Apariencia" en el sidebar, cambia paleta/color libre/tipografía, guarda, navega a "Mi local" y confirma que la sección de apariencia ya no está ahí y que el resto de "Mi local" sigue funcionando igual.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(crm)/admin/apariencia/page.tsx" src/components/admin/AdminApariencia.tsx "src/app/(crm)/admin/AdminShell.tsx" src/components/admin/AdminPerfil.tsx
git commit -m "feat(admin): pantalla Apariencia propia, separada de datos del local"
```

## Context

Esto ataca directamente la queja de que la personalización "está mal organizada": hoy vive mezclada en la misma pantalla larga que datos del local, redes, facturación y QR. Se mueve a su propia ruta, reutilizando el componente compartido de la Task 1.

## Before You Begin

Lee `AdminPerfil.tsx` y `AdminShell.tsx` completos antes de editar. Si el bloque de apariencia no coincide exactamente con lo descrito, ubícalo por su comentario `{/* ─── APARIENCIA PERSONAL` y bórralo completo con todo lo que dependa solo de él.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, tsc/build output, resultado de la verificación manual, commit SHA.

---

### Task 6: Pantalla "Apariencia" propia para Super Admin

**Files:**
- Create: `src/app/(crm)/super/apariencia/page.tsx`
- Create: `src/components/super/SuperApariencia.tsx`
- Modify: `src/app/(crm)/super/SuperShell.tsx`
- Modify: `src/components/super/SuperCuenta.tsx`

Misma estructura que la Task 5, adaptada a Super Admin:

- [ ] **Step 1: Crear `SuperApariencia.tsx`** — igual que `AdminApariencia.tsx` de la Task 5 (mismo contenido, cambiando el nombre del componente y el título a "Apariencia de mi panel").

- [ ] **Step 2: Crear la página**

```tsx
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SuperShell } from '../SuperShell';
import { SuperApariencia } from '@/components/super/SuperApariencia';

export default async function SuperAparienciaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  return (
    <SuperShell profile={profile} view="apariencia">
      <SuperApariencia profile={profile} />
    </SuperShell>
  );
}
```

- [ ] **Step 3: Agregar el ítem de navegación en `SuperShell.tsx`**

En el array `NAV`, agregar antes de `/super/cuenta`:

```tsx
  { href: '/super/apariencia', label: 'Apariencia', icon: 'spark', title: 'Apariencia', sub: 'Tema y colores de tu panel' },
```

- [ ] **Step 4: Quitar la sección de apariencia de `SuperCuenta.tsx`**

Eliminar el bloque `{/* ─── APARIENCIA ─────────────────────────── */}` completo (Tema/Paleta/Tipografía/Densidad/Radio/Gradiente y su botón "Guardar preferencias"), la función `saveTheme`, la función `live`, el estado `theme`/`savingTheme`, la interfaz `ExtTheme`, `getExtTheme`, `PALETAS`, `FUENTES`. Mantén perfil, suscripción, historial, políticas y soporte intactos. Nota: el estado `theme` también se usa en el Avatar del bloque "Perfil" (`<Avatar ... color={theme.palette[0]} .../>`) — reemplázalo por `profile.color` ahí, ya que el estado `theme` deja de existir en este archivo.

- [ ] **Step 5: Verificar tipos y build**

Run: `npx tsc --noEmit` — expected sin errores.
Run: `npm run build` — expected build exitoso, ruta `/super/apariencia` debe aparecer.

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`. Entra como super_admin, prueba la nueva pantalla "Apariencia", confirma que "Mi cuenta" sigue mostrando perfil/suscripción/historial sin la sección de tema.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(crm)/super/apariencia/page.tsx" src/components/super/SuperApariencia.tsx "src/app/(crm)/super/SuperShell.tsx" src/components/super/SuperCuenta.tsx
git commit -m "feat(super): pantalla Apariencia propia, separada de la cuenta"
```

## Context

Mismo objetivo que la Task 5, para el rol Super Admin. Ojo con el uso de `theme.palette[0]` en el Avatar del perfil — hay que reemplazarlo por `profile.color` al quitar el estado `theme` de este archivo, si no el build falla por referencia a una variable que ya no existe.

## Before You Begin

Lee `SuperCuenta.tsx` y `SuperShell.tsx` completos antes de editar.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, tsc/build output, resultado de la verificación manual, commit SHA.

---

### Task 7: Pantalla "Apariencia" propia para Super Root

**Files:**
- Create: `src/app/(crm)/super-root/apariencia/page.tsx`
- Create: `src/components/super-root/SRApariencia.tsx`
- Modify: `src/app/(crm)/super-root/SRShell.tsx`
- Modify: `src/components/super-root/SRCuenta.tsx`

- [ ] **Step 1: Crear `SRApariencia.tsx`** — igual patrón que `AdminApariencia.tsx`/`SuperApariencia.tsx`.

- [ ] **Step 2: Crear la página**

```tsx
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRApariencia } from '@/components/super-root/SRApariencia';

export default async function SRAparienciaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="apariencia">
      <SRApariencia profile={profile} />
    </SRShell>
  );
}
```

- [ ] **Step 3: Agregar el ítem de navegación en `SRShell.tsx`**

En el array `NAV`, agregar antes de `/super-root/cuenta`:

```tsx
  { href: '/super-root/apariencia', label: 'Apariencia', icon: 'spark', title: 'Apariencia', sub: 'Tema y colores de tu panel' },
```

- [ ] **Step 4: Quitar la sección de apariencia de `SRCuenta.tsx`**

Eliminar el bloque `{/* ── Apariencia ── */}` completo (Tema/Paleta/Tipografía/Densidad/Radio/Gradiente), la función `live`, el estado `theme`, la interfaz `ExtTheme`, `getExtTheme`, `PALETAS`, `FONTS`. **Mantén intactos**: el bloque "Perfil" (nombre/alias/avatar), el bloque "Logo de la sidebar" (`brandLogo`, es una función distinta — el logo que reemplaza el ícono de casa del sidebar de Super Root, no tiene que ver con paleta de colores), y el botón "Guardar todos los cambios" (`saveAll`) — pero ojo: `saveAll` hoy incluye `panel_theme: { ...theme }` en el `update`; ese `theme` deja de existir en este archivo, así que `saveAll` debe dejar de tocar `panel_theme` con datos de tema (el guardado del tema ahora vive únicamente en `SRApariencia.tsx`). Ajusta `saveAll` para que solo guarde `full_name`, `alias`, y `panel_theme.brandLogo` (si `brandLogo` tiene valor), sin pisar el resto de `panel_theme` que gestiona la nueva pantalla de Apariencia — usa un patrón de merge sobre `profile.panel_theme` en vez de reconstruirlo desde cero, ej.:

```tsx
async function saveAll() {
  setSaving(true);
  const panel_theme: Record<string, unknown> = { ...(profile.panel_theme as Record<string, unknown>) };
  if (brandLogo) panel_theme.brandLogo = brandLogo;
  const { error } = await supabase.from('profiles').update({
    full_name: form.full_name,
    alias: form.alias || null,
    panel_theme,
  }).eq('id', profile.id);
  if (error) { toast('No se pudo guardar', 'alert'); setSaving(false); return; }
  toast('Cambios guardados', 'check');
  setSaving(false);
}
```

(Se quita también `color: theme.palette[0]` del update, porque ya no hay `theme` en este archivo — el color de marca de Super Root ahora se gestiona únicamente desde la pantalla de Apariencia.)

- [ ] **Step 5: Verificar tipos y build**

Run: `npx tsc --noEmit` — expected sin errores.
Run: `npm run build` — expected build exitoso, ruta `/super-root/apariencia` debe aparecer.

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`. Entra como super_super_admin, prueba "Apariencia", confirma que "Mi cuenta" conserva perfil y logo de sidebar, y que guardar el logo o el nombre no borra la paleta guardada desde Apariencia (ni viceversa).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(crm)/super-root/apariencia/page.tsx" src/components/super-root/SRApariencia.tsx "src/app/(crm)/super-root/SRShell.tsx" src/components/super-root/SRCuenta.tsx
git commit -m "feat(super-root): pantalla Apariencia propia, separada de la cuenta"
```

## Context

Mismo objetivo, para Super Root — con una complicación real: `SRCuenta.tsx` guardaba perfil + logo + tema **en un solo botón** (a diferencia de Admin/Super Admin, que ya tenían botones de guardado separados). Al mover el tema a su propia pantalla, `saveAll` debe dejar de reconstruir `panel_theme` desde cero (`{ ...theme }`) y en vez de eso hacer merge sobre el `panel_theme` actual del perfil, para no borrar accidentalmente la paleta que el usuario guardó desde la nueva pantalla de Apariencia. Este es exactamente el mismo tipo de bug de "escritura no atómica que pisa otra pantalla" que motivó el Bloque 1 — aplica el mismo cuidado aquí aunque `panel_theme` no estaba en el alcance original de esa migración.

## Before You Begin

Lee `SRCuenta.tsx` completo antes de editar. Presta especial atención a `saveAll` — es la parte más fácil de romper de esta tarea.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, tsc/build output, resultado de la verificación manual (especialmente que guardar logo/nombre no borre la paleta), commit SHA.

---

### Task 8: Verificación final del Bloque 2

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Buscar restos de las paletas viejas duplicadas**

Run: `grep -rn "const PALETAS\|const FUENTES\|const FONTS = \['Plus Jakarta" src/`
Expected: sin resultados fuera de `PanelAppearance.tsx` (que exporta `APPEARANCE_PALETTES`/`APPEARANCE_FONTS`, nombres distintos a propósito).

- [ ] **Step 2: Type-check y build completos**

Run: `npx tsc --noEmit` — expected 0 errores.
Run: `npm run build` — expected build exitoso, con las 3 rutas nuevas (`/admin/apariencia`, `/super/apariencia`, `/super-root/apariencia`) listadas.

- [ ] **Step 3: Commit final si quedó algo suelto**

```bash
git add -A
git commit -m "chore: verificacion final del bloque de personalizacion"
```

(Solo si `git status` muestra cambios pendientes — si el working tree ya está limpio, no hay nada que commitear.)

## Fuera de alcance de este plan (queda para el Bloque 3)

- Formas nuevas del croquis de mesas y redimensionado libre.
- Rediseño visual general (dirección A: superficies planas, sin glow neón) y responsive del sidebar.
- Pulido de interacciones (transiciones, skeletons, feedback de presión).
