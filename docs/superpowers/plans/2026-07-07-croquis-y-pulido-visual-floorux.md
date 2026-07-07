# FloorUX — Bloque 3: Croquis ampliado y pulido visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar el editor de croquis de mesas (formas nuevas, redimensionado libre, ajuste a pantalla en mobile) y quitar los efectos de glow/neón concretos identificados en `floorux.css`, con pulido puntual de feedback de interacción.

**Architecture:** Todo el trabajo de mesas vive en `src/components/mesas/MesaFloorPlan.tsx` (ya reescrito en el Bloque 1 para persistir en `mesa_layouts`, una fila por mesa — este bloque solo añade capacidades de edición sobre esa base, no vuelve a tocar la persistencia). El pulido visual es una edición dirigida de `src/styles/floorux.css`, quitando declaraciones puntuales de glow sin reescribir el sistema de diseño completo.

**Tech Stack:** React (client component), CSS, Supabase (ya cubierto por el Bloque 1).

**Nota sobre pruebas:** igual que los bloques anteriores — sin framework de tests. Verificación vía `npx tsc --noEmit`, `npm run build`, y verificación manual en `npm run dev`.

**Nota de alcance importante (decisión tomada durante el brainstorming/verificación previa):** al revisar el responsive real con una cuenta de producción, se confirmó que el sidebar y la mayoría de vistas ya colapsan correctamente en mobile (breakpoint `@media (max-width:860px)` ya existente). Por eso este plan NO reconstruye el responsive general — se enfoca en lo que sí falta: formas/resize de mesas, un ajuste puntual para el croquis en mobile, y quitar los glow. El croquis de mesas usa hoy un canvas de tamaño fijo con scroll horizontal en pantallas chicas (patrón común en editores espaciales tipo Miro/Figma) — la Task 3 agrega un botón opcional de "Ajustar a pantalla" en vez de auto-encoger el canvas por defecto, porque encoger automáticamente el texto de las mesas por debajo de cierto punto lo vuelve ilegible; que sea opcional evita ese riesgo.

---

### Task 1: Formas de mesa ampliadas (cuadrada, ovalada, barra)

**Files:**
- Modify: `src/components/mesas/MesaFloorPlan.tsx`

- [ ] **Step 1: Ampliar el tipo `MesaLayout['shape']` y agregar el mapa de radios**

Reemplazar:
```tsx
interface MesaLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'round';
}
```
por:
```tsx
interface MesaLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'round' | 'square' | 'oval' | 'bar';
}

const SHAPE_LABELS: Record<MesaLayout['shape'], string> = {
  rect: 'Rectángulo',
  round: 'Redonda',
  square: 'Cuadrada',
  oval: 'Ovalada',
  bar: 'Barra',
};

const SHAPE_RADIUS: Record<MesaLayout['shape'], string> = {
  rect: '16px',
  round: '999px',
  square: '12px',
  oval: '50%',
  bar: '10px',
};
```

Colocar ambas constantes justo después de la interfaz `MesaLayout` (antes de `MesaFloorPlanProps`).

- [ ] **Step 2: Agregar la función `setShape`**

Justo después de la función `setSize` existente, agregar:
```tsx
  function setShape(shape: MesaLayout['shape']) {
    if (!selectedId) return;
    const current = layoutRef.current[selectedId] ?? defaultLayout(mesas.findIndex(m => m.id === selectedId));
    const patch: Partial<MesaLayout> = { shape };
    if (shape === 'square') {
      const side = Math.max(current.w, current.h);
      patch.w = side;
      patch.h = side;
    } else if (shape === 'bar') {
      patch.w = 240;
      patch.h = 88;
    }
    patchMesa(selectedId, patch);
  }
```

- [ ] **Step 3: Reemplazar el botón único "Forma" por la fila de formas**

Reemplazar:
```tsx
          <button className="btn sm ghost" disabled={!selected} onClick={() => selectedId && patchMesa(selectedId, { shape: selected?.shape === 'round' ? 'rect' : 'round' })}>
            Forma
          </button>
```
por:
```tsx
          {(['rect', 'round', 'square', 'oval', 'bar'] as const).map(shape => (
            <button
              key={shape}
              className={'btn sm ghost' + (selected?.shape === shape ? ' pri' : '')}
              disabled={!selected}
              onClick={() => setShape(shape)}
            >
              {SHAPE_LABELS[shape]}
            </button>
          ))}
```

- [ ] **Step 4: Usar el mapa de radios al renderizar la mesa**

Reemplazar:
```tsx
                  borderRadius: pos.shape === 'round' ? 999 : 16,
```
por:
```tsx
                  borderRadius: SHAPE_RADIUS[pos.shape],
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit` — expected sin errores. Baseline tras Bloques 1-2 es 0 errores.

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`, entrar como admin a "Mesas", activar "Editar croquis", seleccionar una mesa, probar cada botón de forma (Rectángulo/Redonda/Cuadrada/Ovalada/Barra) y confirmar que el borde visual cambia como se espera (cuadrada se ve con esquinas rectas y proporción 1:1, ovalada se ve elíptica, barra se ve ancha y baja).

- [ ] **Step 7: Commit**

```bash
git add src/components/mesas/MesaFloorPlan.tsx
git commit -m "feat(mesas): ampliar formas de mesa (cuadrada, ovalada, barra)"
```

Do NOT add a "Co-Authored-By" trailer or any AI/Claude attribution.

## Context

Antes de esta tarea, `MesaLayout['shape']` solo admitía `'rect' | 'round'`, con un único botón "Forma" que alternaba entre las dos (`patchMesa(selectedId, { shape: selected?.shape === 'round' ? 'rect' : 'round' })`). Este mapeo binario ya no alcanza con 5 formas — se reemplaza por una fila de botones, uno por forma, siguiendo el mismo patrón visual que los botones de tamaño (`Compacta`/`Media`/`Grande`) que ya existen justo al lado. `patchMesa` (de la persistencia migrada en el Bloque 1) ya persiste cualquier cambio de forma/tamaño en una sola fila de `mesa_layouts` — no requiere cambios.

## Before You Begin

Lee el archivo completo antes de editar — línea por línea coincide con lo citado arriba, pero confirma antes de tocar nada.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, tsc output, resultado de la verificación manual, commit SHA.

---

### Task 2: Redimensionado libre arrastrando la esquina

**Files:**
- Modify: `src/components/mesas/MesaFloorPlan.tsx`

- [ ] **Step 1: Agregar el ref y las funciones de resize**

Justo después de la declaración de `dragRef` (`const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);`), agregar:
```tsx
  const resizeRef = useRef<{ id: string; startW: number; startH: number; startX: number; startY: number } | null>(null);
```

Justo después de la función `endDrag`, agregar:
```tsx
  function startResize(event: React.PointerEvent<HTMLDivElement>, mesa: T) {
    event.stopPropagation();
    const current = layoutRef.current[mesa.id] ?? defaultLayout(mesas.findIndex(m => m.id === mesa.id));
    resizeRef.current = { id: mesa.id, startW: current.w, startH: current.h, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event: React.PointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;
    const plan = planRef.current;
    if (!resize || !plan) return;

    const rect = plan.getBoundingClientRect();
    const scaleX = PLAN_W / rect.width;
    const scaleY = PLAN_H / rect.height;
    const dw = (event.clientX - resize.startX) * scaleX;
    const dh = (event.clientY - resize.startY) * scaleY;
    const current = layoutRef.current[resize.id] ?? defaultLayout(0);
    const w = clamp(resize.startW + dw, MIN_W, PLAN_W - current.x);
    const h = clamp(resize.startH + dh, MIN_H, PLAN_H - current.y);
    setLayout(prev => ({ ...prev, [resize.id]: { ...current, w, h } }));
  }

  function endResize(event: React.PointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;
    if (!resize) return;
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const entry = layoutRef.current[resize.id];
    if (entry) void saveMesaLayout(resize.id, entry);
  }
```

- [ ] **Step 2: Renderizar el handle de resize en la mesa seleccionada**

Dentro del `.map(mesa => ...)` que renderiza cada tarjeta de mesa, justo antes del cierre del `<div className="mesa-card">` (después del bloque de `{mesa.admin_modified && (...)}），agregar:
```tsx
                {editMode && selectedId === mesa.id && (
                  <div
                    onPointerDown={(event) => startResize(event, mesa)}
                    onPointerMove={moveResize}
                    onPointerUp={endResize}
                    style={{
                      position: 'absolute', right: -6, bottom: -6, width: 18, height: 18,
                      borderRadius: 6, background: 'var(--accent2)', border: '2px solid var(--panel)',
                      cursor: 'nwse-resize', touchAction: 'none', zIndex: 2,
                    }}
                  />
                )}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit` — expected sin errores.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`, entrar a "Mesas" como admin, activar edición, seleccionar una mesa, arrastrar el pequeño cuadro en la esquina inferior derecha y confirmar que la mesa cambia de tamaño en tiempo real, se guarda (indicador "Guardando croquis..." → "Croquis sincronizado"), y persiste tras refrescar.

- [ ] **Step 5: Commit**

```bash
git add src/components/mesas/MesaFloorPlan.tsx
git commit -m "feat(mesas): redimensionar libremente arrastrando la esquina"
```

Do NOT add a "Co-Authored-By" trailer or any AI/Claude attribution.

## Context

Antes de esta tarea, el único control de tamaño eran 3 botones fijos (`Compacta`/`Media`/`Grande`, vía `setSize`). Esta tarea agrega un cuarto mecanismo — arrastre libre — sin quitar los botones existentes (algunos admins preferirán el atajo rápido, otros el control fino). El handle solo se muestra cuando la mesa está seleccionada y en modo edición, para no interferir con el drag de posición (`startDrag`/`moveDrag`/`endDrag`, que sigue intacto) — `event.stopPropagation()` en `startResize` evita que el `onPointerDown` del handle dispare también el `onPointerDown` del `mesa-card` padre (que llama a `startDrag`).

## Before You Begin

Lee el archivo completo (ya con los cambios de la Task 1 aplicados) antes de editar.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, tsc output, resultado de la verificación manual (incluyendo que persista tras refrescar), commit SHA.

---

### Task 3: Botón "Ajustar a pantalla" para el croquis en mobile

**Files:**
- Modify: `src/components/mesas/MesaFloorPlan.tsx`

- [ ] **Step 1: Agregar estado de ajuste a pantalla**

Justo después de `const [saving, setSaving] = useState(false);`, agregar:
```tsx
  const [fitToScreen, setFitToScreen] = useState(false);
```

- [ ] **Step 2: Agregar el botón en la barra de acciones (junto a "Editar croquis")**

Reemplazar:
```tsx
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {editable && (
            <>
              <button className={'btn sm' + (editMode ? ' pri' : '')} onClick={() => setEditMode(!editMode)}>
                <Icon name="edit" s={14} /> {editMode ? 'Terminar edición' : 'Editar croquis'}
              </button>
              {editMode && (
                <button className="btn sm ghost" onClick={resetLayout}>
                  <Icon name="history" s={14} /> Reordenar
                </button>
              )}
            </>
          )}
          {onCreateMesa && (
```
por:
```tsx
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={'btn sm ghost' + (fitToScreen ? ' pri' : '')} onClick={() => setFitToScreen(f => !f)}>
            <Icon name="search" s={14} /> {fitToScreen ? 'Tamaño real' : 'Ajustar a pantalla'}
          </button>
          {editable && (
            <>
              <button className={'btn sm' + (editMode ? ' pri' : '')} onClick={() => setEditMode(!editMode)}>
                <Icon name="edit" s={14} /> {editMode ? 'Terminar edición' : 'Editar croquis'}
              </button>
              {editMode && (
                <button className="btn sm ghost" onClick={resetLayout}>
                  <Icon name="history" s={14} /> Reordenar
                </button>
              )}
            </>
          )}
          {onCreateMesa && (
```

(`Icon name="search"` ya se usa en otras partes del código para lupa/zoom — ver `Topbar.tsx`. Si al revisar `Icon.tsx` ese nombre no existe, usa `"history"` como alternativa disponible.)

- [ ] **Step 3: Aplicar el transform de escala al canvas**

Reemplazar el bloque:
```tsx
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div
          ref={planRef}
          className="card floor-plan"
          style={{
            position: 'relative',
            minWidth: 720,
            aspectRatio: `${PLAN_W} / ${PLAN_H}`,
            overflow: 'hidden',
            background:
              'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px), color-mix(in srgb, var(--panel2) 78%, transparent)',
            backgroundSize: '40px 40px',
            border: '1px solid var(--line2)',
          }}
        >
```
por:
```tsx
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div
          ref={planRef}
          className="card floor-plan"
          style={{
            position: 'relative',
            minWidth: fitToScreen ? 0 : 720,
            width: fitToScreen ? '100%' : undefined,
            aspectRatio: `${PLAN_W} / ${PLAN_H}`,
            overflow: 'hidden',
            background:
              'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px), color-mix(in srgb, var(--panel2) 78%, transparent)',
            backgroundSize: '40px 40px',
            border: '1px solid var(--line2)',
          }}
        >
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit` — expected sin errores.

- [ ] **Step 5: Verificación manual en mobile**

Run: `npm run dev`, abrir DevTools con viewport angosto (ej. 375px) o usar el resize del preview, entrar a "Mesas", tocar "Ajustar a pantalla" y confirmar que el croquis completo se ve sin necesidad de scroll horizontal (aunque las mesas se vean más pequeñas), y que "Tamaño real" vuelve a lo de antes (croquis a tamaño fijo con scroll).

- [ ] **Step 6: Commit**

```bash
git add src/components/mesas/MesaFloorPlan.tsx
git commit -m "feat(mesas): boton opcional para ajustar el croquis a la pantalla"
```

Do NOT add a "Co-Authored-By" trailer or any AI/Claude attribution.

## Context

El croquis usa un `aspectRatio` fijo (`1000/620`) con `minWidth:720` (o `680px !important` por CSS en mobile) y scroll horizontal — patrón común en editores espaciales (similar a Miro/Figma en mobile), y deliberadamente NO se reemplaza por un auto-encogido por defecto: encoger el canvas completo para que quepa en 375px de ancho reduciría el texto de las mesas (13-18px) a un tamaño realistamente ilegible en la mayoría de los casos. En cambio, este toggle es opcional — por defecto el croquis se comporta exactamente igual que antes (tamaño real + scroll), y el usuario decide cuándo prefiere ver el panorama completo a cambio de mesas más chicas. Al activar `fitToScreen`, quitar `minWidth:720` y fijar `width:'100%'` hace que el `aspectRatio` existente calcule la altura proporcionalmente, encogiendo todo el canvas (incluido el texto) para caber en el ancho disponible sin necesidad de scroll.

## Before You Begin

Verifica el nombre de ícono `"search"` en `src/components/ui/Icon.tsx` antes de usarlo; si no existe, usa `"history"` (ya usado en este mismo archivo para el botón "Reordenar") y repórtalo como ajuste menor, no como bloqueo.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, tsc output, resultado de la verificación manual en mobile, commit SHA.

---

### Task 4: Quitar el glow neón

**Files:**
- Modify: `src/styles/floorux.css`

- [ ] **Step 1: Quitar la variable `--glow` y su único uso**

En el bloque `:root`, eliminar la línea:
```css
  --glow:0 0 0 1px color-mix(in srgb,var(--accent) 50%,transparent), 0 0 30px -6px var(--accent);
```

En la sección `/* ---------- mesas ---------- */`, cambiar:
```css
.mesa.ocupada{border-color:color-mix(in srgb,var(--accent) 60%,transparent);box-shadow:var(--glow)}
```
por:
```css
.mesa.ocupada{border-color:color-mix(in srgb,var(--accent) 60%,transparent)}
```

- [ ] **Step 2: Aplanar el glow del botón flotante de Maylo (`.fab`)**

En la sección `/* ---------- Maylo dock ---------- */`, cambiar:
```css
.fab{position:relative;width:62px;height:62px;border-radius:19px;border:1px solid #2c2752;cursor:pointer;background:radial-gradient(120% 120% at 50% 20%,#23204a,#14121d);display:flex;align-items:center;justify-content:center;transition:.2s;box-shadow:0 14px 40px -12px var(--accent)}
```
por:
```css
.fab{position:relative;width:62px;height:62px;border-radius:19px;border:1px solid #2c2752;cursor:pointer;background:radial-gradient(120% 120% at 50% 20%,#23204a,#14121d);display:flex;align-items:center;justify-content:center;transition:.2s;box-shadow:0 10px 24px -12px rgba(0,0,0,.6)}
```

Eliminar por completo las 2 líneas del anillo pulsante (ya no se necesitan — el `<span>` que las usaba en el componente sigue existiendo pero, sin estas reglas, no dibuja nada):
```css
.fab-ring{position:absolute;inset:-4px;border-radius:21px;border:2px solid var(--accent);opacity:0;animation:ring 2.6s ease-out infinite}
@keyframes ring{0%{opacity:.55;transform:scale(.9)}80%,100%{opacity:0;transform:scale(1.25)}}
```

- [ ] **Step 3: Quitar el glow del punto de tip (`.tk`)**

En la sección del drawer, cambiar:
```css
.tk{width:7px;height:7px;border-radius:50%;background:var(--accent2);margin-top:6px;flex:none;box-shadow:0 0 8px var(--accent2)}
```
por:
```css
.tk{width:7px;height:7px;border-radius:50%;background:var(--accent2);margin-top:6px;flex:none}
```

- [ ] **Step 4: Verificar que no queden referencias a `--glow` ni a `.fab-ring`/`ring`**

Run: `grep -n "\-\-glow\|fab-ring\|@keyframes ring" src/styles/floorux.css`
Expected: sin resultados.

- [ ] **Step 5: Verificar build**

Run: `npm run build` — expected build exitoso (es un cambio puramente CSS, no debería afectar tipos).

- [ ] **Step 6: Verificación manual**

Run: `npm run dev`, entrar a "Mesas" y confirmar que una mesa ocupada se distingue por su borde de color (sin el resplandor difuso alrededor), y revisar el botón flotante de Maylo (esquina inferior derecha) para confirmar que ya no pulsa un anillo brillante alrededor.

- [ ] **Step 7: Commit**

```bash
git add src/styles/floorux.css
git commit -m "style: quitar glow neon por superficies planas (mesas, boton Maylo, tips)"
```

Do NOT add a "Co-Authored-By" trailer or any AI/Claude attribution.

## Context

Esto ataca directamente el feedback de que la app "se ve muy genérica/gamer" (mismo feedback que motivó la paleta curada del Bloque 2). Se acota a los 3 efectos que son literalmente "glow" (sombra difusa + color, o anillo pulsante) — la variable `--glow` en sí, el resplandor del botón flotante de Maylo, y el punto de tip. Las sombras normales de elevación (`.btn.pri`, `.card`, `.stat`, etc.) NO se tocan en esta tarea — son sombras suaves estándar, no efectos de neón, y forman parte de la dirección visual "evolución" (no un rediseño minimalista total).

## Before You Begin

Confirma con `grep -n "\-\-glow"` antes de editar que no hay más usos de la variable además de `.mesa.ocupada` (el plan asume que ese es el único). Si aparece en más lugares, no los borres sin revisar cada caso — repórtalo.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, resultado del grep de verificación, build output, resultado de la verificación manual, commit SHA.

---

### Task 5: Feedback de presión en botones y tarjetas interactivas

**Files:**
- Modify: `src/styles/floorux.css`

- [ ] **Step 1: Agregar feedback de presión (`:active`) a los elementos interactivos principales**

Después de la regla `.btn:disabled{opacity:.4;cursor:not-allowed}` (sección `/* ---------- buttons ---------- */`), agregar:
```css
.btn:active:not(:disabled){transform:scale(.97)}
```

Después de la regla `.mesa-card:hover{transform:translateY(-1px)}` (dentro del `<style jsx>` de `MesaFloorPlan.tsx`, sección de estilos del croquis — NO en `floorux.css`, ver Step 2), se agrega en ese mismo archivo.

En `floorux.css`, después de `.prod:hover{border-color:var(--accent);transform:translateY(-2px)}` (sección `/* ---------- POS ticket ---------- */`), agregar:
```css
.prod:active:not(:disabled){transform:scale(.96)}
```

Después de `.pay:hover{border-color:var(--line2)}` (misma sección), agregar:
```css
.pay:active{transform:scale(.97)}
```

Después de `.mesa:hover{transform:translateY(-3px);border-color:var(--line2)}` (sección `/* ---------- mesas ---------- */`, la grilla simple de mesas — NO el croquis), agregar:
```css
.mesa:active{transform:scale(.98)}
```

- [ ] **Step 2: Agregar feedback de presión a `.mesa-card` (dentro de `MesaFloorPlan.tsx`)**

**Files:**
- Modify: `src/components/mesas/MesaFloorPlan.tsx`

En el bloque `<style jsx>` al final del archivo, cambiar:
```tsx
        .mesa-card {
          transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
        }
        .mesa-card:hover {
          transform: translateY(-1px);
        }
```
por:
```tsx
        .mesa-card {
          transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
        }
        .mesa-card:hover {
          transform: translateY(-1px);
        }
        .mesa-card:active {
          transform: scale(.98);
        }
```

- [ ] **Step 3: Verificar build**

Run: `npm run build` — expected build exitoso.

- [ ] **Step 4: Verificación manual**

Run: `npm run dev`, presionar (click sostenido) sobre un botón, una mesa del croquis, y una tarjeta de producto en el POS — confirmar que cada uno se encoge levemente al presionar (feedback táctil), sin quedar "pegado" tras soltar.

- [ ] **Step 5: Commit**

```bash
git add src/styles/floorux.css src/components/mesas/MesaFloorPlan.tsx
git commit -m "feat(ui): feedback de presion en botones, mesas y tarjetas interactivas"
```

Do NOT add a "Co-Authored-By" trailer or any AI/Claude attribution.

## Context

Esto ataca el pedido de "performance tipo iOS" de forma acotada: feedback de presión (`:active{transform:scale(...)}`) es la señal táctil más perceptible y de menor riesgo de implementar — no cambia layout, no requiere JS, y es un patrón estándar en apps móviles nativas. Se acota a los elementos clicables de mayor uso (botones, mesas del croquis, mesas de la grilla operativa, productos del POS, métodos de pago); no se tocan todos los elementos de la app para mantener el cambio revisable.

## Before You Begin

Ninguno de estos selectores debería colisionar con estilos existentes, pero confirma que cada regla `:hover` citada existe exactamente así antes de agregar la de `:active` justo después.

## Report Format

Report: **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT, diffs, build output, resultado de la verificación manual, commit SHA.

---

### Task 6: Verificación final del Bloque 3

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Type-check y build completos**

Run: `npx tsc --noEmit` — expected 0 errores.
Run: `npm run build` — expected build exitoso.

- [ ] **Step 2: Confirmar que no quedan referencias a los efectos removidos**

Run: `grep -rn "\-\-glow\|fab-ring" src/`
Expected: sin resultados.

- [ ] **Step 3: Checklist manual final**

Run: `npm run dev` y confirmar, como admin, en la vista de Mesas:
- Las 5 formas de mesa se ven distintas entre sí.
- El resize por arrastre de esquina funciona y persiste.
- "Ajustar a pantalla" muestra el croquis completo sin scroll; "Tamaño real" vuelve al comportamiento original.
- Ninguna mesa ocupada ni el botón de Maylo muestran resplandor difuso.
- Botones y tarjetas dan feedback visual al presionar.

- [ ] **Step 4: Commit final si quedó algo suelto**

```bash
git add -A
git commit -m "chore: verificacion final del bloque de croquis y pulido visual"
```

(Solo si `git status` muestra cambios pendientes.)

## Fuera de alcance de este plan

- Rediseño visual completo de `floorux.css` más allá de los efectos de glow puntuales — se mantiene el resto del sistema de diseño intacto.
- Responsive general de las 4 vistas — ya verificado como funcional en la sesión de brainstorming/QA previa a este plan.
- Skeletons de carga y otras animaciones de transición más allá del feedback de presión — quedan como posible trabajo futuro si el usuario lo pide explícitamente, para no expandir el alcance de este bloque sin validarlo primero.
