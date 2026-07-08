# FloorUX by OperUX

POS + CRM para discotecas, tabernas y bares. Gestión de mesas, inventario, turnos, reportes y comunicación interna en tiempo real.

---

## Arquitectura de roles

```
super_super_admin  (1 instancia global — OperUX)
    └── super_admin     (N — controla 1..N comercios propios)
            └── admin          (1 por comercio, creado por super_admin)
                    └── empleado    (N por comercio, creado por admin)
```

**Reglas de aislamiento:**
- Cada super_admin y su red de comercios es una isla de datos aislada.
- El super_super_admin opera sobre todo el sistema.
- Suspender un super_admin bloquea en cascada todos sus admins y empleados.
- Suspender un comercio bloquea todos los profiles del comercio.

---

## Paneles por rol

| Rol | Ruta base | Capacidades |
|-----|-----------|-------------|
| `super_super_admin` | `/super-root` | Dashboard global, gestión de todos los super_admins, comercios, usuarios, logs de auditoría, cuadre de inventario |
| `super_admin` | `/super` | Sus comercios, reportes consolidados, administradores, chat, cuenta |
| `admin` | `/admin` | Resumen en tiempo real, reportes, inventario, equipo, chat, perfil del local |
| `empleado` | `/empleado` | Mesas (POS), turno activo, historial de ventas |

---

## Stack técnico

| Tecnología | Rol |
|-----------|-----|
| Next.js 14 App Router | Framework full-stack |
| TypeScript strict | Tipado estático |
| Supabase | Auth, DB (PostgreSQL), Realtime, Storage |
| Zustand | Store cliente optimista (mesas, inventario) |
| Zod | Validación en server actions y API routes |
| Tailwind CSS | Utilidades base |
| `globals.css` | Sistema de diseño completo (dark/light, glass, tokens por tenant) |

---

## Setup local

### 1. Clonar / navegar al directorio

```bash
cd CRMs/floorux
```

### 2. Instalar dependencias

```bash
npm install
# o: pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

### 4. Ejecutar migraciones en Supabase

En el dashboard de Supabase → SQL Editor, ejecutar en orden:

```sql
-- 1. Esquema y RLS
-- Contenido de supabase/migrations/001_schema.sql

-- 2. Datos demo (opcional)
-- Contenido de supabase/seed.sql
```

### 5. Configurar Supabase

- **Auth:** Deshabilitar sign up público (`Authentication > Settings > Disable signup`)
- **Realtime:** Habilitar en tablas `mesas`, `mesa_items`, `messages`
- **Storage:** Crear bucket `avatars` (público, 2MB max) y `evidencias` (privado)

### 6. Crear el super_super_admin inicial

Ejecutar en SQL Editor de Supabase (reemplazar con datos reales):

```sql
-- 1. Crear usuario en auth.users vía Supabase Auth Admin API o dashboard
-- 2. Insertar perfil:
INSERT INTO public.profiles (id, full_name, email, role, activo, color)
VALUES ('<uuid-del-usuario-auth>', 'OperUX Root', 'root@operux.co', 'super_super_admin', true, '#B57BE0');
```

### 7. Iniciar servidor de desarrollo

```bash
npm run dev
# App disponible en http://localhost:3000
```

---

## Despliegue

### Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `supabase/migrations/001_schema.sql` en SQL Editor
3. Ejecutar `supabase/seed.sql` (datos demo, opcional)
4. Configurar Auth: deshabilitar signup público
5. Habilitar Realtime en `mesas`, `mesa_items`, `messages`
6. Crear buckets `avatars` (público) y `evidencias` (privado)

### Vercel

1. Conectar repositorio en [vercel.com](https://vercel.com)
2. Framework: `Next.js`
3. Agregar variables de entorno:

| Variable | Descripción | Pública |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server) | No |
| `NEXT_PUBLIC_APP_URL` | URL de la app desplegada | Sí |

4. Deploy

---

## Seguridad

- **RLS habilitado** en todas las tablas sin excepciones
- **Service role key** nunca expuesta al cliente
- **Rate limiting** en API routes de creación de usuarios (10 req/min por IP)
- **Audit log** obligatorio en: login, create user, delete, suspend/activate
- **Headers de seguridad**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Validación Zod** en todos los server actions y API routes
- **Soft delete**: tablas críticas usan `deleted_at`, no borrado físico desde UI
- **Cascada de suspensión**: suspender super_admin bloquea toda su red

---

## Estructura de carpetas

```
floorux/
├── src/
│   ├── app/
│   │   ├── (crm)/              # Grupo de rutas protegidas
│   │   │   ├── super-root/     # Panel super_super_admin
│   │   │   ├── super/          # Panel super_admin
│   │   │   ├── admin/          # Panel admin
│   │   │   └── empleado/       # Panel empleado (POS)
│   │   ├── api/
│   │   │   └── admin/create-user/  # Endpoint de creación de usuarios
│   │   └── login/              # Página de login
│   ├── components/
│   │   ├── ui/                 # Atoms: Icon, Avatar, Stat, Chip, Bars, Donut, Modal, Field
│   │   ├── shell/              # Shell: Sidebar, Topbar, MayloDrawer
│   │   ├── chat/               # ChatPanel (realtime)
│   │   ├── super-root/         # Vistas del super root
│   │   ├── super/              # Vistas del super admin
│   │   ├── admin/              # Vistas del admin
│   │   └── empleado/           # Vistas del empleado
│   ├── hooks/
│   │   ├── useFloorUX.ts       # Store Zustand (mesas, inventario, turno)
│   │   ├── useChat.ts          # Chat realtime Supabase
│   │   └── useAuditLog.ts      # Escritura de audit logs
│   ├── lib/
│   │   ├── supabase/           # Clientes browser, server y admin
│   │   ├── auth.ts             # Helpers de sesión y rol
│   │   ├── audit.ts            # Server action de audit log
│   │   └── utils.ts            # COP, COPk, exportCSV, rangos de fecha
│   ├── styles/
│   │   └── globals.css         # Sistema de diseño completo (tokens, glass, responsive)
│   └── types/
│       ├── db.ts               # Tipos de todas las tablas
│       └── roles.ts            # Roles y rutas por rol
├── supabase/
│   ├── migrations/001_schema.sql  # Schema + RLS
│   └── seed.sql                   # Datos demo
├── public/
│   └── maylo.js                # Robot SVG animado (no modificar)
└── middleware.ts               # Guard de autenticación y roles
```

---

## Variables de entorno

| Variable | Descripción | Visibilidad |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Pública (cliente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | Pública (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio con privilegios totales | Privada (solo servidor) |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación | Pública (cliente) |
