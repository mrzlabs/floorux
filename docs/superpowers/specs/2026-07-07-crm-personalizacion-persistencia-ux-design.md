# FloorUX — Persistencia confiable, personalización por rol y rediseño UX

## Contexto

FloorUX (rama `main`, desplegada en Vercel) es el CRM/POS en producción para bares y discotecas. Este proyecto junta tres frentes que comparten causa y objetivo comunes — que la app se sienta sólida, personalizable y con estándares de producto actuales — y se atacan en un solo ciclo de spec → plan → implementación, organizado en 3 bloques.

## Alcance

1. **Persistencia confiable**: eliminar la clase de bug donde una pantalla pisa los cambios guardados por otra (croquis de mesas que se revierte, foto del comercio que desaparece al cambiar de panel, y un bug de pérdida de datos encontrado en el camino: registros públicos de clientes/reservas que se pisan entre sí).
2. **Personalización por rol**: modo claro/oscuro accesible desde cualquier vista para todos los roles; paleta de color de marca en manos de quien corresponde (cada rol personaliza la suya, empleados heredan la de su admin); selector de color libre en vez de solo paletas prearmadas; todo reorganizado en una pantalla de apariencia coherente.
3. **Rediseño UX/UI**: dirección visual "evolución del identity actual" (se mantiene violeta/cian/magenta, pero superficies planas sin glow neón), responsive real en las 4 vistas, interacciones más pulidas (transiciones, skeletons, feedback táctil).

Fuera de alcance: cambios al modelo de roles/permisos de negocio, nuevas funcionalidades de facturación electrónica, el panel público del cliente (`/local/[comercioId]`) más allá de arreglar su bug de persistencia.

## Bloque 1 — Modelo de datos y persistencia

### Causa raíz encontrada

`comercios.settings` (JSONB) es escrito desde al menos 4 lugares distintos — croquis de mesas (`MesaFloorPlan.tsx`), configuración comercial y facturación (`AdminPerfil.tsx`), y el endpoint público de clientes/reservas (`api/public/local/[comercioId]/route.ts`) — todos con el patrón "leer todo `settings` en el cliente/request → modificar una clave → escribir todo `settings` de vuelta". Dos escrituras cercanas en el tiempo (dos pantallas, o dos clientes públicos registrándose a la vez) hacen que la segunda pise a la primera. Esto explica el bug reportado del croquis de mesas, y expone un bug más serio: **registros de clientes y reservas del panel público se pueden perder silenciosamente** bajo uso concurrente normal (varios clientes registrándose el mismo viernes en la noche).

La foto del comercio (`comercios.photo_url`) es una columna aparte, no vive en `settings`, así que no comparte esta causa raíz — se trata como bug independiente (ver más abajo).

### Cambios de esquema

- **Tabla `mesa_layouts`**: `mesa_id` (PK, FK a `mesas.id` on delete cascade), `comercio_id`, `x`, `y`, `w`, `h`, `shape`, `updated_at`. Cada mesa es una fila independiente; guardar el layout de una mesa es un *upsert* de una sola fila, sin leer ni tocar las demás. RLS: lectura para admin/empleado del comercio; escritura solo admin.
- **Columnas nuevas en `comercios`**: `commercial_settings jsonb default '{}'`, `invoice_settings jsonb default '{}'`, `brand_theme jsonb default '{}'` (reemplaza la clave `config_visual`/fallback de `VisualTheme.tsx`). Cada pantalla que hoy comparte `settings` pasa a leer/escribir solo su propia columna.
- **Tablas `public_customers` y `public_reservations`**: columnas relacionales explícitas (no arrays en JSON) con `comercio_id` FK. `public_customers` con índice único `(comercio_id, lower(email))` para el `existing.find` que hoy se hace en memoria. Insertar un cliente o una reserva pasa a ser un `INSERT` de una fila — ninguna escritura concurrente puede pisar a otra porque ninguna necesita leer el estado completo antes de escribir.
- **Migración de datos**: script que recorre `comercios.settings` existente y copia `tableLayout` → `mesa_layouts`, `commercial`/`electronicInvoice`/`config_visual` → las columnas nuevas, `publicCrm.customers`/`publicCrm.reservations` → las tablas nuevas, para cada comercio existente. Tras la migración, `settings` deja de usarse para estos fines (se puede dejar la columna vacía para uso futuro, no se elimina en esta fase).

### Cambios de frontend

- `MesaFloorPlan.tsx`: `loadLayout`/`saveLayout`/canal realtime pasan de `comercios.settings.tableLayout` a `select`/`upsert` sobre `mesa_layouts`.
- `AdminPerfil.tsx` / `SuperCuenta.tsx`: `persistCommercial`, `persistInvoice` escriben `comercios.commercial_settings` / `comercios.invoice_settings` en vez de reconstruir `settings` completo.
- `VisualTheme.tsx` / `CommerceVisualTheme`: leen `comercios.brand_theme` en vez de `settings.config_visual`.
- `api/public/local/[comercioId]/route.ts`: los tres flujos (`login`, `register`, `reservation`) pasan de mutar arrays en `settings` a `insert`/`upsert` sobre `public_customers` y `public_reservations`. El conteo que hoy muestra `AdminPerfil` (`publicCrm.customers.length`, `publicCrm.reservations.length`) pasa a un `select count`.

### Bug de la foto del comercio (independiente)

No comparte la causa raíz anterior. Antes de aplicar un fix, la implementación debe reproducir el bug de forma dirigida (qué secuencia exacta de navegación lo dispara, en qué rol) usando el flujo de depuración sistemática, en vez de asumir una causa. Hipótesis a verificar durante la implementación, en orden de probabilidad: (a) una condición de carrera entre el fetch inicial server-side y el canal realtime al montar `AdminShell`/`EmpShell`, (b) política RLS o del bucket `floorux-media` que bloquea la lectura pública en algún rol/contexto, (c) caché de Next.js en algún segmento de ruta. Se corrige con evidencia del repro, no especulativamente.

## Bloque 2 — Sistema de personalización

### Modelo de permisos (confirmado)

- `super_super_admin`, `super_admin` y `admin` mantienen cada uno su **propia** paleta de color personal (como hoy), pero con mejor UI (ver abajo). No cambia quién puede fijar colores.
- Empleados heredan la paleta del admin de su comercio (ya funciona así vía `EmpShell` → `loadAdminTheme`); no personalizan colores, solo modo.
- **Modo claro/oscuro se vuelve personal e inmediato para los 4 roles**: hoy solo Empleado tiene el botón rápido en el pie del sidebar (`ThemeModeToggle` en `navFooter`); Admin, Super Admin y Super Root lo tienen que cambiar desde su pantalla de cuenta. Se agrega el mismo botón rápido al sidebar de `AdminShell`, `SuperShell` y `SRShell`.

### Componente compartido de apariencia

Hoy `AdminPerfil.tsx` y `SuperCuenta.tsx` duplican casi línea por línea el bloque de tema (`ExtTheme`, `PALETAS`, `getExtTheme`, controles de modo/paleta/tipografía/densidad/radio/gradiente). Se extrae a un componente compartido (p. ej. `components/theme/PanelAppearance.tsx`) parametrizado por `profileId` + `panel_theme` inicial, usado por `AdminPerfil`, `SuperCuenta` y `SRCuenta`. Se elimina `ThemeCustomizer.tsx` (versión vieja, más limitada, ya no se usa una vez migrado).

### Selector de color

Se mantiene una fila de paletas curadas como acceso rápido (reducidas y con nombres más acordes a un producto de hospitalidad, no "Neón"/"Lava"/"Galaxia"), y se agrega control fino: un `<input type="color">` por acento (accent/accent2/accent3) para quien quiera definir su propio color exacto, igual que ya existe en el color de marca del perfil personal (`form.color` en `AdminPerfil`).

### Reorganización de la pantalla

La sección "Mi panel — apariencia personal" se separa del resto de `AdminPerfil` (datos del local, comercial, facturación, QR) en su propia pestaña/pantalla dedicada de "Apariencia", reutilizando el mismo patrón en las 3 vistas que la tienen (admin, super, super-root).

### Aplicación sin parpadeo (FOUC)

Hoy `applyFullTheme` se ejecuta en un `useEffect` de `AdminShell`/`SuperShell`/`SRShell`/`EmpShell`, es decir, después del primer render — se ve brevemente el tema por defecto antes del correcto en cada navegación dura o recarga. Se agrega: el modo/paleta se guarda también en una cookie (además de en `profiles.panel_theme`), y un script inline en el `<head>` del layout raíz lee esa cookie y aplica `data-theme` + variables CSS antes de que el árbol de React hidrate. Esto es lo que hace que el cambio de tema "se refleje bien" de forma consistente entre vistas, que fue una de las quejas explícitas.

## Bloque 3 — Croquis de mesas y rediseño UX

### Croquis de mesas

Sobre la base de `mesa_layouts` (Bloque 1), que ya resuelve la persistencia:
- Formas nuevas: cuadrada, ovalada, barra/mesa larga (además de rectángulo/redonda actuales).
- Tamaño libre: además de los 3 tamaños fijos (compacta/media/grande), se agrega redimensionar arrastrando la esquina de la mesa seleccionada en modo edición, respetando `MIN_W`/`MIN_H` ya definidos en `MesaFloorPlan.tsx`.

### Dirección visual

Dirección **A — evolución del identity actual**, validada con mockup durante el brainstorming: se mantiene la paleta violeta/cian/magenta (`--accent`, `--accent2`, `--accent3`) y la base oscura de `floorux.css`, pero:
- Se retiran los efectos de glow/neón (`--glow`, sombras `0 0 30px -6px var(--accent)`) en favor de superficies planas con borde de 1px.
- Se revisa jerarquía tipográfica y espaciado para que no se sienta "plantilla genérica".
- El archivo `floorux.css` deja de tratarse como "no modificar" (nota del README a actualizar) — es exactamente lo que este bloque interviene, con cambios incrementales por sección (sidebar, topbar, cards, tablas) en vez de una reescritura total.

### Responsive

`.app{grid-template-columns:248px 1fr}` es un layout fijo sin colapso en pantallas chicas. Se agrega comportamiento de drawer/overlay para el sidebar por debajo de un breakpoint (tablet/mobile) en las 4 vistas (`AdminShell`, `SuperShell`, `SRShell`, `EmpShell`), reutilizando el estado `sideOpen`/`open` que ya existe en `Sidebar.tsx` pero hoy no tiene un breakpoint automático que lo dispare (el usuario debe abrirlo manualmente con el botón de menú incluso en desktop).

### Pulido de interacción ("performance tipo iOS")

- Transiciones de entrada/salida con curva de aceleración (spring-like) en modales, drawers y toasts, en vez de aparición abrupta.
- Feedback de presión (`scale(0.97)` en botones/tarjetas clicables) consistente en toda la app.
- Skeletons en las cargas de datos que hoy muestran contenido vacío mientras llega la respuesta de Supabase (listas de mesas, reportes, inventario), en vez de un parpadeo de vacío → lleno.

## Plan de pruebas

- **Bloque 1**: prueba de concurrencia manual/automatizada — dos escrituras simultáneas a `mesa_layouts`/`public_customers`/`public_reservations` no deben perder ninguna; verificar que guardar comercial no afecte facturación ni viceversa (antes vivían en el mismo blob).
- **Bloque 2**: cambiar tema en cada uno de los 4 roles y verificar que persiste tras recarga dura y tras navegar entre todas las pantallas de ese rol, sin parpadeo del tema anterior.
- **Bloque 3**: editar croquis (mover, redimensionar, cambiar forma), recargar y confirmar que el orden/posición/forma se mantiene idéntico; probar sidebar responsive en viewport mobile/tablet/desktop en las 4 vistas.

## Riesgos

- La migración de `settings` a tablas/columnas nuevas es un cambio de esquema en producción — requiere migración de datos cuidadosa antes de retirar la lectura del `settings` viejo (rollout en dos pasos: escribir en ambos lados primero, luego cortar la lectura vieja).
- Cambiar `floorux.css` es un archivo compartido por toda la app — cambios incrementales y verificación visual por pantalla para evitar regresiones.
