# EmpMesas Rediseño - Centro de Operaciones Nocturno

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar EmpMesas.tsx en un centro de operaciones nocturno estilo POS moderno, eliminar bug de stock, e implementar permisos granulares admin vs empleado.

**Architecture:** Optimistic updates síncronos sin Realtime de products, nueva tabla mesa_audit_log para auditoría, permisos condicionales via prop isAdmin, rediseño visual completo con animaciones.

**Tech Stack:** React, TypeScript, Supabase Realtime, Next.js 14, CSS-in-JS (styled-jsx)

---

## File Structure

**Modified Files:**
- `src/components/empleado/EmpMesas.tsx` - Component principal (rediseño completo)
- `src/app/(crm)/empleado/mesas/page.tsx` - Agregar prop isAdmin
- `src/app/(crm)/admin/mesas/page.tsx` - Migrar a usar EmpMesas con isAdmin=true

**New Files:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_mesa_audit_log.sql` - Tabla de auditoría

**Deprecated:**
- `src/components/admin/AdminMesas.tsx` - Consolidar en EmpMesas (no eliminar aún, deprecar gradualmente)

---

## Task 1: Crear Migración de Base de Datos - mesa_audit_log

**Files:**
- Create: `supabase/migrations/20260607000001_create_mesa_audit_log.sql`

- [ ] **Step 1: Crear archivo de migración**

```sql
-- Migration: Create mesa_audit_log table
-- Purpose: Track admin actions on mesas (remove items, reduce qty, cancel mesa)

CREATE TABLE IF NOT EXISTS mesa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('remove_item', 'reduce_qty', 'cancel_mesa')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  qty INT,
  motivo TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queries by mesa
CREATE INDEX idx_mesa_audit_log_mesa_id ON mesa_audit_log(mesa_id);

-- Index for queries by admin
CREATE INDEX idx_mesa_audit_log_admin_id ON mesa_audit_log(admin_id);

-- Index for queries by date
CREATE INDEX idx_mesa_audit_log_created_at ON mesa_audit_log(created_at DESC);

-- RLS policies
ALTER TABLE mesa_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view audit logs for their comercio
CREATE POLICY "Admins can view audit logs"
  ON mesa_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = admin_id
      AND usuarios.comercio_id IN (
        SELECT comercio_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

-- Policy: Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON mesa_audit_log
  FOR INSERT
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'super_root')
    )
  );

COMMENT ON TABLE mesa_audit_log IS 'Audit trail for admin actions on mesas';
COMMENT ON COLUMN mesa_audit_log.action IS 'Type of action: remove_item, reduce_qty, cancel_mesa';
COMMENT ON COLUMN mesa_audit_log.motivo IS 'Admin-provided reason for the action';
```

- [ ] **Step 2: Verificar sintaxis SQL**

Run: `cat supabase/migrations/20260607000001_create_mesa_audit_log.sql`
Expected: File content displays correctly

- [ ] **Step 3: Aplicar migración (local)**

```bash
supabase db reset
```

Expected: Migration applies successfully, no errors

- [ ] **Step 4: Verificar tabla creada**

```bash
supabase db diff
```

Expected: mesa_audit_log table exists with correct schema

- [ ] **Step 5: Commit migración**

```bash
git add supabase/migrations/20260607000001_create_mesa_audit_log.sql
git commit -m "feat(db): crear tabla mesa_audit_log para auditoría admin

- Acciones: remove_item, reduce_qty, cancel_mesa
- RLS policies para admins
- Indexes optimizados para queries

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Actualizar Props de EmpMesas y Page Routes

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:33-37`
- Modify: `src/app/(crm)/empleado/mesas/page.tsx:16`
- Modify: `src/app/(crm)/admin/mesas/page.tsx:16-17`

- [ ] **Step 1: Actualizar interface EmpMesasProps**

In `src/components/empleado/EmpMesas.tsx`, update lines 33-37:

```typescript
interface EmpMesasProps {
  comercioId: string;
  empleadoId: string;
  shiftId: string | null;
  isAdmin: boolean; // NEW
}
```

- [ ] **Step 2: Actualizar function signature**

In `src/components/empleado/EmpMesas.tsx`, update line 39:

```typescript
export function EmpMesas({ comercioId, empleadoId, shiftId, isAdmin }: EmpMesasProps) {
```

- [ ] **Step 3: Actualizar empleado page route**

In `src/app/(crm)/empleado/mesas/page.tsx`, update line 16:

```typescript
<EmpMesas 
  comercioId={profile.comercio_id!} 
  empleadoId={profile.id} 
  shiftId={shift?.id ?? null}
  isAdmin={false}
/>
```

- [ ] **Step 4: Actualizar admin page route para usar EmpMesas**

In `src/app/(crm)/admin/mesas/page.tsx`, replace lines 4-5 and 16-17:

```typescript
// Line 4-5: Change import
import { EmpMesas } from '@/components/empleado/EmpMesas';
// Remove: import { AdminMesas } from '@/components/admin/AdminMesas';

// Line 16-17: Use EmpMesas with isAdmin=true
<EmpMesas 
  comercioId={comercio.id} 
  empleadoId={profile.id} 
  shiftId={null}
  isAdmin={true}
/>
```

- [ ] **Step 5: Verificar TypeScript sin errores**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 6: Commit cambios de props**

```bash
git add src/components/empleado/EmpMesas.tsx src/app/(crm)/empleado/mesas/page.tsx src/app/(crm)/admin/mesas/page.tsx
git commit -m "feat(mesas): agregar prop isAdmin para permisos granulares

- EmpMesas ahora recibe isAdmin boolean
- Empleado page: isAdmin=false
- Admin page: isAdmin=true (migrado de AdminMesas)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Eliminar Canal Realtime de Products (Fix Bug Stock)

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:94-108`

- [ ] **Step 1: Eliminar suscripción a products channel**

In `src/components/empleado/EmpMesas.tsx`, **DELETE** lines 94-102:

```typescript
// DELETE THIS BLOCK:
const productsChannel = supabase
  .channel(`products-emp:${comercioId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'products',
    filter: `comercio_id=eq.${comercioId}`,
  }, () => loadProducts())
  .subscribe();
```

- [ ] **Step 2: Actualizar cleanup en useEffect**

In `src/components/empleado/EmpMesas.tsx`, update line 104-108 (after deletion, these become 96-100):

```typescript
return () => {
  supabase.removeChannel(mesasChannel);
  supabase.removeChannel(itemsChannel);
  // REMOVED: supabase.removeChannel(productsChannel);
};
```

- [ ] **Step 3: Verificar app compila**

Run: `npm run dev`
Expected: Dev server starts without errors

- [ ] **Step 4: Test manual - verificar stock NO actualiza en tiempo real**

1. Abrir modal POS
2. En otra sesión/tab, cambiar stock de un producto directamente en BD
3. Verificar que badge de stock NO se actualiza automáticamente en modal abierto
Expected: Stock permanece igual (no hay Realtime update)

- [ ] **Step 5: Commit fix bug stock**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "fix(mesas): eliminar canal Realtime products - fix doble stock

El canal Realtime de products causaba doble conteo al revertir ítems.
Solución: gestión de stock exclusivamente vía optimistic updates síncronos.

Impacto: Stock en modal POS no se actualiza en tiempo real (aceptable).
Validación en BD (.gt('stock', 0)) previene overselling.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Implementar Optimistic Update en addToCart

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:225-263`

- [ ] **Step 1: Reescribir addToCart con optimistic update**

In `src/components/empleado/EmpMesas.tsx`, replace function `addToCart` (lines 225-263):

```typescript
async function addToCart(product: Product) {
  if (!selectedMesa) return;
  if (product.stock <= 0) {
    toast('Producto agotado', 'alert');
    return;
  }

  // 1. Optimistic update: descontar inmediatamente del estado local
  setProducts(prev => prev.map(p => 
    p.id === product.id 
      ? { ...p, stock: p.stock - 1 } 
      : p
  ));

  // 2. Persistir en BD (async con validación)
  const { error: stockError } = await supabase
    .from('products')
    .update({ stock: product.stock - 1 })
    .eq('id', product.id)
    .gt('stock', 0); // Validación: solo si stock > 0

  if (stockError) {
    // 3. Revertir si falla
    setProducts(prev => prev.map(p => 
      p.id === product.id 
        ? { ...p, stock: p.stock + 1 } 
        : p
    ));
    toast('Error al actualizar inventario', 'alert');
    return;
  }

  // 4. Agregar a mesa_items
  const existing = selectedMesa.items.find(i => i.product_id === product.id);
  if (existing) {
    const newQty = existing.qty + 1;
    await supabase
      .from('mesa_items')
      .update({ qty: newQty })
      .eq('mesa_id', selectedMesa.id)
      .eq('product_id', product.id);
  } else {
    await supabase.from('mesa_items').insert({
      mesa_id: selectedMesa.id,
      product_id: product.id,
      qty: 1,
      unit_price: product.price,
      unit_cost: product.cost,
    });
  }
}
```

- [ ] **Step 2: Verificar TypeScript sin errores**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 3: Test manual - agregar producto**

1. Abrir modal POS
2. Click en producto con stock > 0
3. Verificar: badge stock decrementa INMEDIATAMENTE
4. Verificar: producto aparece en consumo
Expected: Optimistic update visual instantáneo, persistencia exitosa

- [ ] **Step 4: Test manual - agregar producto agotado**

1. Producto con stock = 0
2. Click en producto
3. Verificar: toast "Producto agotado", no se agrega
Expected: Validación funciona

- [ ] **Step 5: Test manual - simular error de BD**

1. Desconectar internet / pausar Supabase
2. Click en producto
3. Verificar: decrementa visualmente, luego revierte + toast error
Expected: Rollback funciona

- [ ] **Step 6: Commit optimistic update addToCart**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): optimistic update en addToCart con rollback

- Decremento de stock síncrono en estado local
- Persistencia async con validación .gt('stock', 0)
- Rollback automático si falla BD
- UX: respuesta instantánea al usuario

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Implementar Funciones Admin - removeItem y cancelarMesa

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx` (agregar nuevas funciones)

- [ ] **Step 1: Agregar función removeItem (solo admin)**

In `src/components/empleado/EmpMesas.tsx`, add after `addToCart` function:

```typescript
async function removeItem(item: CartItem, motivo: string) {
  if (!selectedMesa || !isAdmin) return;

  // 1. Optimistic update: restaurar stock inmediatamente
  setProducts(prev => prev.map(p => 
    p.id === item.product_id 
      ? { ...p, stock: p.stock + item.qty } 
      : p
  ));

  // 2. Obtener producto actual para calcular nuevo stock
  const product = products.find(p => p.id === item.product_id);
  if (!product) return;

  // 3. Persistir en BD
  await supabase
    .from('products')
    .update({ stock: product.stock + item.qty })
    .eq('id', item.product_id);

  // 4. Eliminar de mesa_items
  await supabase
    .from('mesa_items')
    .delete()
    .eq('mesa_id', selectedMesa.id)
    .eq('product_id', item.product_id);

  // 5. Audit log
  await supabase.from('mesa_audit_log').insert({
    mesa_id: selectedMesa.id,
    action: 'remove_item',
    product_id: item.product_id,
    qty: item.qty,
    motivo,
    admin_id: empleadoId,
  });

  toast('Producto eliminado', 'check');
}
```

- [ ] **Step 2: Agregar función reducirCantidad (solo admin)**

In `src/components/empleado/EmpMesas.tsx`, add after `removeItem`:

```typescript
async function reducirCantidad(item: CartItem, qty: number, motivo: string) {
  if (!selectedMesa || !isAdmin) return;
  
  const newQty = item.qty - qty;
  
  if (newQty <= 0) {
    // Si llega a 0, eliminar el ítem
    removeItem(item, motivo);
    return;
  }
  
  // 1. Optimistic update: restaurar stock
  setProducts(prev => prev.map(p => 
    p.id === item.product_id 
      ? { ...p, stock: p.stock + qty } 
      : p
  ));
  
  // 2. Obtener producto actual
  const product = products.find(p => p.id === item.product_id);
  if (!product) return;

  // 3. Persistir en BD
  await supabase
    .from('products')
    .update({ stock: product.stock + qty })
    .eq('id', item.product_id);
  
  // 4. Actualizar mesa_items
  await supabase
    .from('mesa_items')
    .update({ qty: newQty })
    .eq('mesa_id', selectedMesa.id)
    .eq('product_id', item.product_id);
  
  // 5. Audit log
  await supabase.from('mesa_audit_log').insert({
    mesa_id: selectedMesa.id,
    action: 'reduce_qty',
    product_id: item.product_id,
    qty,
    motivo,
    admin_id: empleadoId,
  });
  
  toast(`Cantidad reducida: -${qty}`, 'check');
}
```

- [ ] **Step 3: Agregar función cancelarMesa (solo admin)**

In `src/components/empleado/EmpMesas.tsx`, add after `reducirCantidad`:

```typescript
async function cancelarMesa(motivo: string) {
  if (!selectedMesa || !isAdmin) return;

  // 1. Acumular TODOS los cambios de stock
  const stockChanges = new Map<string, number>();
  selectedMesa.items.forEach(item => {
    stockChanges.set(item.product_id, item.qty);
  });

  // 2. UN SOLO setProducts con todos los cambios
  setProducts(prev => prev.map(p => {
    const qtyToRestore = stockChanges.get(p.id);
    return qtyToRestore 
      ? { ...p, stock: p.stock + qtyToRestore }
      : p;
  }));

  // 3. Persistir cada producto en BD
  for (const [productId, qty] of stockChanges) {
    const product = products.find(p => p.id === productId);
    if (product) {
      await supabase
        .from('products')
        .update({ stock: product.stock + qty })
        .eq('id', productId);
    }
  }

  // 4. Eliminar todos los items
  await supabase
    .from('mesa_items')
    .delete()
    .eq('mesa_id', selectedMesa.id);

  // 5. Liberar mesa
  await supabase
    .from('mesas')
    .update({ 
      status: 'libre', 
      alias: null, 
      opened_at: null, 
      opened_by: null 
    })
    .eq('id', selectedMesa.id);

  // 6. Audit log
  await supabase.from('mesa_audit_log').insert({
    mesa_id: selectedMesa.id,
    action: 'cancel_mesa',
    motivo,
    admin_id: empleadoId,
  });

  setSelectedMesa(null);
  toast('Mesa cancelada y stock restaurado', 'check');
}
```

- [ ] **Step 4: Actualizar updateItemQty - solo permitir incremento si isAdmin=false**

In `src/components/empleado/EmpMesas.tsx`, update function `updateItemQty` (lines 265-298):

```typescript
async function updateItemQty(item: CartItem, delta: number) {
  if (!selectedMesa) return;

  // EMPLEADO: solo puede aumentar cantidad, NO reducir
  if (!isAdmin && delta < 0) {
    toast('Contacta al administrador para reducir cantidades', 'alert');
    return;
  }

  // ADMIN: puede aumentar o reducir
  if (isAdmin && delta < 0) {
    // Abrir modal de reducir cantidad
    setReduceItem(item);
    setShowReduceNota(true);
    return;
  }

  const newQty = item.qty + delta;

  // Obtener producto actual para calcular nuevo stock
  const product = products.find(p => p.id === item.product_id);
  if (!product) return;

  // Aumentando cantidad: descontar del inventario
  if (product.stock <= 0) {
    toast('Producto agotado', 'alert');
    return;
  }

  // Optimistic update
  setProducts(prev => prev.map(p => 
    p.id === item.product_id 
      ? { ...p, stock: p.stock - 1 } 
      : p
  ));

  const { error } = await supabase
    .from('products')
    .update({ stock: product.stock - 1 })
    .eq('id', item.product_id)
    .gt('stock', 0);

  if (error) {
    // Revertir
    setProducts(prev => prev.map(p => 
      p.id === item.product_id 
        ? { ...p, stock: p.stock + 1 } 
        : p
    ));
    toast('Error al actualizar inventario', 'alert');
    return;
  }

  await supabase
    .from('mesa_items')
    .update({ qty: newQty })
    .eq('mesa_id', selectedMesa.id)
    .eq('product_id', item.product_id);
}
```

- [ ] **Step 5: Verificar TypeScript sin errores**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 6: Commit funciones admin**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): funciones admin removeItem, reducirCantidad, cancelarMesa

- removeItem: elimina ítem + restaura stock + audit log
- reducirCantidad: reduce qty + restaura stock parcial + audit log
- cancelarMesa: libera mesa + restaura TODO el stock + audit log
- updateItemQty: empleado solo incrementa, admin puede decrementar

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Agregar Estado para Modales de Admin

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:70-92`

- [ ] **Step 1: Agregar estado para modal reducir cantidad**

In `src/components/empleado/EmpMesas.tsx`, after line 58 (existing modal states), add:

```typescript
// Modal: Reducir cantidad (admin)
const [showReduceNota, setShowReduceNota] = useState(false);
const [reduceItem, setReduceItem] = useState<CartItem | null>(null);
const [reduceQty, setReduceQty] = useState(1);
const [reduceMotivo, setReduceMotivo] = useState('');
const [reduceMotivoCustom, setReduceMotivoCustom] = useState('');
```

- [ ] **Step 2: Agregar estado para modal eliminar ítem**

```typescript
// Modal: Eliminar ítem (admin)
const [showRemoveNota, setShowRemoveNota] = useState(false);
const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
const [removeMotivo, setRemoveMotivo] = useState('');
const [removeMotivoCustom, setRemoveMotivoCustom] = useState('');
```

- [ ] **Step 3: Agregar estado para modal cancelar mesa**

```typescript
// Modal: Cancelar mesa (admin)
const [showCancelarNota, setShowCancelarNota] = useState(false);
const [cancelarMotivo, setCancelarMotivo] = useState('');
const [cancelarMotivoCustom, setCancelarMotivoCustom] = useState('');
```

- [ ] **Step 4: Agregar constantes de motivos**

At the top of the file, after line 18 (PAYMENTS constant), add:

```typescript
const MOTIVOS_REDUCIR = [
  'Error del empleado',
  'Cliente cambió pedido',
  'Producto equivocado',
  'Otro'
];

const MOTIVOS_ELIMINAR = [
  'Error de pedido',
  'Cortesía',
  'Devolución',
  'Otro'
];

const MOTIVOS_CANCELAR = [
  'Cobro externo',
  'Cortesía total',
  'Error operativo',
  'Otro'
];
```

- [ ] **Step 5: Verificar TypeScript sin errores**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 6: Commit estado modales admin**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): agregar estado para modales de admin

- Modal reducir cantidad con motivo
- Modal eliminar ítem con motivo
- Modal cancelar mesa con motivo
- Constantes de motivos predefinidos

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Rediseñar Header Strip con 3 Zonas

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:479-531`

- [ ] **Step 1: Reemplazar header venta de la noche**

In `src/components/empleado/EmpMesas.tsx`, replace lines 479-531 (header section):

```tsx
{/* Header venta de la noche */}
<div style={{
  background: 'var(--panel)',
  borderBottom: '1px solid var(--line)',
  padding: '16px 20px',
  marginBottom: 20,
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  }}>
    {/* Zona Izquierda */}
    <div>
      <div style={{
        fontSize: 11,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        marginBottom: 4,
      }}>
        VENTA DE LA NOCHE
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        color: 'var(--accent)',
        marginBottom: 4,
      }}>
        {COP(totalAcumulado)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        {mesasAbiertas.length} abiertas · {mesasLibres.length} libres
      </div>
    </div>

    {/* Zona Centro - Barra de barras proporcional */}
    <div style={{
      display: 'flex',
      gap: 3,
      maxWidth: 400,
      height: 32,
      borderRadius: 4,
      overflow: 'hidden',
      background: 'var(--panel)',
    }}>
      {mesasAbiertas.map((mesa) => {
        const mesaTotal = mesa.items.reduce((s, i) => s + i.price * i.qty, 0);
        const percentage = totalAcumulado > 0 ? (mesaTotal / totalAcumulado) * 100 : 0;
        return (
          <div
            key={mesa.id}
            style={{
              display: 'inline-block',
              height: '100%',
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
            }}
            title={`${mesa.name}: ${COP(mesaTotal)}`}
          />
        );
      })}
    </div>

    {/* Zona Derecha */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {shift && (
        <div style={{
          background: 'color-mix(in srgb, var(--green) 20%, transparent)',
          color: 'var(--green)',
          padding: '6px 12px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span className="live-dot">●</span> EN VIVO
        </div>
      )}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          fontFeatureSettings: '"tnum"',
        }}>
          {elapsedTime}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          turno en curso
        </div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Actualizar estilos CSS - animación pulse-live**

In `src/components/empleado/EmpMesas.tsx`, find the `<style jsx>` block (around line 1106) and update:

```tsx
<style jsx>{`
  .live-dot {
    display: inline-block;
    animation: pulse-live 2s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @media (max-width: 768px) {
    .mesa-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .pos-modal {
      grid-template-columns: 1fr !important;
      max-height: 95vh !important;
    }
  }
`}</style>
```

- [ ] **Step 3: Test visual - verificar header**

Run: `npm run dev`
Navigate to: http://localhost:3000/empleado/mesas

Expected:
- 3 zonas visibles: izquierda (venta), centro (barras), derecha (cronómetro)
- Barra de barras proporcional visible con tooltips
- Chip "EN VIVO" pulsante si hay shift
- Cronómetro actualiza cada segundo

- [ ] **Step 4: Test responsive - mobile**

Resize browser to 375px width
Expected: Header se adapta, elementos no se superponen

- [ ] **Step 5: Commit header rediseñado**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): rediseñar header - 3 zonas estilo POS

Zona izquierda: Venta de la noche + stats
Zona centro: Barra de barras proporcional con tooltips
Zona derecha: Chip EN VIVO pulsante + cronómetro

Animación pulse-live para chip EN VIVO

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Rediseñar Tarjetas de Mesa (Libre y Abierta)

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:573-711`

- [ ] **Step 1: Rediseñar tarjeta mesa libre**

In `src/components/empleado/EmpMesas.tsx`, replace mesa card rendering (lines 573-687):

```tsx
{mesasOrdenadas.map(mesa => (
  <div
    key={mesa.id}
    draggable
    onDragStart={() => handleDragStart(mesa.id)}
    onDragOver={handleDragOver}
    onDrop={() => handleDrop(mesa.id)}
    className={`mesa-card ${draggedId === mesa.id ? 'dragging' : ''}`}
    style={{
      borderRadius: 'var(--r-lg)',
      padding: 16,
      cursor: 'pointer',
      background: mesa.status === 'ocupada'
        ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
        : 'var(--panel)',
      border: mesa.status === 'ocupada'
        ? '2px solid var(--accent)'
        : '1px solid var(--line)',
      boxShadow: mesa.status === 'ocupada'
        ? '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 8px 32px color-mix(in srgb, var(--accent) 20%, transparent)'
        : 'none',
      position: 'relative',
      minHeight: 160,
      overflow: 'hidden',
      transition: 'all 0.3s ease',
    }}
    onClick={() => {
      if (mesa.status === 'libre') {
        setOpeningMesa(mesa);
      } else {
        setSelectedMesa(mesa);
      }
    }}
  >
    {/* Badge status */}
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        fontSize: 10,
        fontWeight: 800,
        padding: '3px 8px',
        borderRadius: 99,
        background: mesa.status === 'ocupada' ? 'var(--accent)' : 'var(--panel3)',
        color: mesa.status === 'ocupada' ? '#fff' : 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
      }}
    >
      {mesa.status === 'ocupada' ? 'ABIERTA' : 'LIBRE'}
    </div>

    {/* Nombre */}
    <div style={{
      position: 'absolute',
      top: 10,
      left: 12,
      fontWeight: 700,
      fontSize: 13,
      color: 'var(--ink)',
    }}>
      {mesa.name}
    </div>

    {mesa.status === 'ocupada' ? (
      <>
        {/* Barra de progreso */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          width: `${Math.min((mesa.items.reduce((s, i) => s + i.price * i.qty, 0) / 200000) * 100, 100)}%`,
          background: 'linear-gradient(to right, var(--accent), var(--accent2))',
        }} />

        {/* Contenido mesa abierta */}
        <div style={{ paddingTop: 36 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            {mesa.alias}
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--ink)',
            letterSpacing: '-0.03em',
            marginBottom: 6,
          }}>
            {COP(mesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            {(() => {
              if (!mesa.opened_at) return '· ' + mesa.items.reduce((s, i) => s + i.qty, 0) + ' ítems';
              const start = new Date(mesa.opened_at).getTime();
              const now = Date.now();
              const diff = now - start;
              const hours = Math.floor(diff / 3600000);
              const minutes = Math.floor((diff % 3600000) / 60000);
              const itemCount = mesa.items.reduce((s, i) => s + i.qty, 0);
              return `⏱ ${hours}h ${minutes}m · ${itemCount} ítems`;
            })()}
          </div>

          {/* Chips de productos */}
          {mesa.items.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {mesa.items.slice(0, 3).map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 99,
                    background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                    color: 'var(--accent)',
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {item.name}
                </span>
              ))}
              {mesa.items.length > 3 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 99,
                    background: 'var(--accent)',
                    color: '#fff',
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  +{mesa.items.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </>
    ) : (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        paddingTop: 30,
        gap: 8,
      }}>
        <Icon name="plus" s={32} color="var(--muted)" />
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Abrir</div>
      </div>
    )}
  </div>
))}
```

- [ ] **Step 2: Agregar estilos CSS para hover y dragging**

In `src/components/empleado/EmpMesas.tsx`, update `<style jsx>` block:

```tsx
<style jsx>{`
  .live-dot {
    display: inline-block;
    animation: pulse-live 2s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .mesa-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  .mesa-card.dragging {
    opacity: 0.5;
  }
  @media (max-width: 768px) {
    .mesa-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .pos-modal {
      grid-template-columns: 1fr !important;
      max-height: 95vh !important;
    }
  }
`}</style>
```

- [ ] **Step 3: Rediseñar tarjeta "Nueva mesa"**

In `src/components/empleado/EmpMesas.tsx`, update "Nueva mesa" card (after the map):

```tsx
{/* Tarjeta nueva mesa */}
<div
  className="mesa-card"
  style={{
    borderRadius: 'var(--r-lg)',
    padding: 16,
    cursor: 'pointer',
    border: '2px dashed var(--line2)',
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    transition: 'all 0.15s ease',
  }}
  onClick={() => setCreating(true)}
>
  <Icon name="plus" s={32} color="var(--muted)" />
  <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
    Nueva mesa
  </div>
</div>
```

- [ ] **Step 4: Test visual - tarjetas de mesa**

Run: `npm run dev`
Navigate to: http://localhost:3000/empleado/mesas

Expected:
- Mesas libres: badge gris, ícono +, hover effect
- Mesas abiertas: badge accent, barra progreso, chips productos
- Tarjeta "Nueva mesa": border dashed, hover effect
- Drag & drop: opacity 0.5 durante drag

- [ ] **Step 5: Commit tarjetas rediseñadas**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): rediseñar tarjetas mesa - estilo POS moderno

Mesa libre: badge gris, ícono +, hover translateY
Mesa abierta: badge accent, barra progreso, chips productos
Nueva mesa: border dashed, hover effect
Drag & drop: opacity 0.5

Transición smooth 0.3s, box-shadow 3 niveles

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Rediseñar Modal POS - Header y Catálogo

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:783-926`

- [ ] **Step 1: Actualizar container del modal POS**

In `src/components/empleado/EmpMesas.tsx`, update modal container (line 791-806):

```tsx
<div
  className="card pos-modal"
  style={{
    width: '100%',
    maxWidth: 1200,
    maxHeight: '88vh',
    height: '88vh',
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 0,
    overflow: 'hidden',
    background: 'var(--panel)',
    borderRadius: 22,
    border: '1px solid var(--line2)',
    color: 'var(--ink)',
  }}
  onClick={e => e.stopPropagation()}
>
```

- [ ] **Step 2: Rediseñar header del modal**

Replace modal header section (lines 808-820):

```tsx
{/* Header del modal */}
<div style={{
  gridColumn: '1 / -1',
  height: 56,
  background: 'var(--panel2)',
  borderBottom: '1px solid var(--line)',
  padding: '0 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <Icon name="table" s={18} />
    <div style={{ fontSize: 18, fontWeight: 800 }}>
      {selectedMesa.name} · {selectedMesa.alias}
    </div>
  </div>
  <button className="icon-btn" onClick={() => setSelectedMesa(null)}>
    <Icon name="close" s={20} />
  </button>
</div>
```

- [ ] **Step 3: Rediseñar barra de búsqueda**

Update search bar section (lines 821-834):

```tsx
{/* Columna izquierda: Catálogo */}
<div style={{
  borderRight: '1px solid var(--line)',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '88vh',
  background: 'var(--bg2)',
}}>
  {/* Barra de búsqueda */}
  <div style={{ padding: 14 }}>
    <div style={{
      position: 'relative',
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      padding: '10px 14px',
    }}>
      <Icon
        name="search"
        s={16}
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--muted)',
        }}
      />
      <input
        className="inp"
        type="text"
        placeholder="Buscar producto..."
        value={q}
        onChange={e => setQ(e.target.value)}
        style={{
          paddingLeft: 36,
          border: 'none',
          background: 'transparent',
          width: '100%',
        }}
      />
    </div>
  </div>
```

- [ ] **Step 4: Rediseñar chips de categoría**

Update category chips section:

```tsx
  {/* Chips de categoría */}
  <div style={{
    display: 'flex',
    gap: 8,
    padding: '0 14px 12px',
    overflowX: 'auto',
  }}>
    {cats.map(c => (
      <button
        key={c}
        className={'cat-chip' + (cat === c ? ' active' : '')}
        style={{
          height: 32,
          padding: '0 16px',
          borderRadius: 'var(--r-md)',
          fontSize: 13,
          fontWeight: cat === c ? 700 : 600,
          background: cat === c ? 'var(--accent)' : 'var(--panel)',
          border: cat === c ? 'none' : '1px solid var(--line)',
          color: cat === c ? '#fff' : 'var(--muted)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
        onClick={() => setCat(c)}
      >
        {c === 'all' ? 'Todas' : c}
      </button>
    ))}
  </div>
```

- [ ] **Step 5: Actualizar grid de productos**

Update products grid container:

```tsx
  {/* Grid de productos */}
  <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 10,
    }}>
      {prodsFiltrados.map(p => (
        // Product cards (next step)
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 6: Test visual - modal POS header y búsqueda**

Run: `npm run dev`
Open modal POS

Expected:
- Border radius 22px
- Header 56px height con nombre mesa
- Barra búsqueda con ícono search
- Chips categoría activo/inactivo
- Grid 2 columnas

- [ ] **Step 7: Commit modal POS header y catálogo**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): rediseñar modal POS - header y catálogo

- Container: border-radius 22px, height 88vh
- Header: 56px sticky con nombre mesa
- Búsqueda: input con ícono search, padding optimizado
- Chips categoría: activo accent, inactivo panel
- Grid productos: 2 columnas, gap 10px

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Rediseñar Product Cards con Badge Stock

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:856-924`

- [ ] **Step 1: Rediseñar product card**

In `src/components/empleado/EmpMesas.tsx`, replace product card rendering (lines 856-924):

```tsx
{prodsFiltrados.map(p => (
  <div
    key={p.id}
    className="product-card"
    style={{
      background: p.stock === 0
        ? 'color-mix(in srgb, var(--red) 5%, var(--panel))'
        : 'var(--panel)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-md)',
      padding: 12,
      cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
      position: 'relative',
      transition: 'all 0.12s ease',
    }}
    onClick={() => p.stock > 0 && addToCart(p)}
  >
    {/* Overlay agotado */}
    {p.stock === 0 && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--r-md)',
          fontSize: 13,
          fontWeight: 800,
          color: 'var(--red)',
          background: 'color-mix(in srgb, var(--red) 12%, transparent)',
          border: '1px solid var(--red)',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      >
        Agotado
      </div>
    )}

    {/* Badge stock */}
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: '50%',
        fontSize: 11,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          p.stock === 0
            ? 'var(--red)'
            : p.stock <= p.min_stock
            ? '#f59e42'
            : 'var(--panel3)',
        color:
          p.stock === 0 || p.stock <= p.min_stock
            ? '#fff'
            : 'var(--ink)',
      }}
    >
      {p.stock}
    </div>

    {/* Contenido */}
    <div style={{
      fontWeight: 700,
      fontSize: 14,
      marginBottom: 4,
      opacity: p.stock === 0 ? 0.4 : 1,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }}>
      {p.name}
    </div>
    <div style={{
      fontSize: 11,
      color: 'var(--muted)',
      marginBottom: 6,
    }}>
      {p.cat} · {p.unit}
    </div>
    <div style={{
      fontSize: 16,
      fontWeight: 800,
      color: 'var(--accent)',
      textDecoration: p.stock === 0 ? 'line-through' : 'none',
      opacity: p.stock === 0 ? 0.4 : 1,
    }}>
      {COP(p.price)}
    </div>
  </div>
))}
```

- [ ] **Step 2: Agregar estilos CSS para product card hover y active**

In `src/components/empleado/EmpMesas.tsx`, update `<style jsx>` block:

```tsx
<style jsx>{`
  .live-dot {
    display: inline-block;
    animation: pulse-live 2s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .mesa-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  .mesa-card.dragging {
    opacity: 0.5;
  }
  .product-card:hover:not([style*="not-allowed"]) {
    border-color: var(--accent);
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .product-card:active:not([style*="not-allowed"]) {
    transform: scale(0.97);
    background: color-mix(in srgb, var(--accent) 12%, var(--panel));
  }
  @keyframes productAdd {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    75% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @media (max-width: 768px) {
    .mesa-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .pos-modal {
      grid-template-columns: 1fr !important;
      max-height: 95vh !important;
    }
  }
`}</style>
```

- [ ] **Step 3: Test visual - product cards**

Run: `npm run dev`
Open modal POS

Expected:
- Badge stock: rojo (0), naranja (bajo), gris (normal)
- Overlay "Agotado" en productos sin stock
- Hover: border accent, scale 1.02
- Active: scale 0.97, background accent 12%
- Precio tachado si stock = 0

- [ ] **Step 4: Test interacción - agregar producto**

1. Click en producto con stock > 0
2. Verificar: badge stock decrementa inmediatamente
Expected: Optimistic update funciona visualmente

- [ ] **Step 5: Commit product cards rediseñadas**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): rediseñar product cards con badge stock

- Badge stock: colores por nivel (rojo/naranja/gris)
- Overlay agotado con opacity 0.6
- Hover: border accent + scale 1.02
- Active: scale 0.97 + background accent
- Precio tachado si stock = 0
- Nombre truncado 2 líneas

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Rediseñar Columna Consumo - Sticky Header

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:929-1015`

- [ ] **Step 1: Rediseñar sticky header de consumo**

In `src/components/empleado/EmpMesas.tsx`, replace consumo column header (lines 932-962):

```tsx
{/* Columna derecha: Consumo */}
<div style={{
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '88vh',
  background: 'var(--panel)',
}}>
  {/* Header sticky */}
  <div
    style={{
      position: 'sticky',
      top: 0,
      background: 'var(--panel)',
      borderBottom: '1px solid var(--line)',
      padding: '16px 20px',
      zIndex: 10,
    }}
  >
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        marginBottom: 6,
      }}>
        CONSUMO
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--muted)',
        marginBottom: 10,
      }}>
        {selectedMesa.items.reduce((s, i) => s + i.qty, 0)} ítems
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        color: 'var(--accent)',
        letterSpacing: '-0.03em',
        marginBottom: 16,
      }}>
        {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
      </div>
    </div>

    <button
      className="btn primary"
      style={{
        width: '100%',
        padding: '14px 16px',
        fontSize: 15,
        fontWeight: 800,
        background: 'var(--accent)',
        borderColor: 'var(--accent)',
        color: '#fff',
        height: 48,
        borderRadius: 'var(--r-md)',
        transition: 'all 0.15s',
      }}
      disabled={selectedMesa.items.length === 0}
      onClick={() => setShowingCobro(true)}
    >
      Cerrar mesa y cobrar
    </button>
  </div>
```

- [ ] **Step 2: Actualizar estilos CSS - hover del botón**

In `src/components/empleado/EmpMesas.tsx`, update `<style jsx>` block:

```tsx
<style jsx>{`
  .live-dot {
    display: inline-block;
    animation: pulse-live 2s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .mesa-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  .mesa-card.dragging {
    opacity: 0.5;
  }
  .product-card:hover:not([style*="not-allowed"]) {
    border-color: var(--accent);
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .product-card:active:not([style*="not-allowed"]) {
    transform: scale(0.97);
    background: color-mix(in srgb, var(--accent) 12%, var(--panel));
  }
  .btn.primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .btn.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @keyframes productAdd {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    75% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @media (max-width: 768px) {
    .mesa-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .pos-modal {
      grid-template-columns: 1fr !important;
      max-height: 95vh !important;
    }
  }
`}</style>
```

- [ ] **Step 3: Test visual - sticky header**

Run: `npm run dev`
Open modal POS, scroll lista de ítems

Expected:
- Header consumo permanece fijo al scroll
- Label "CONSUMO" uppercase muted
- Total 28px bold accent
- Botón 48px height, disabled si items.length === 0

- [ ] **Step 4: Commit sticky header consumo**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): rediseñar sticky header columna consumo

- Position sticky, z-index 10
- Label CONSUMO uppercase muted
- Total 28px bold accent, letter-spacing -0.03em
- Botón cerrar mesa: 48px height, hover brightness + translateY
- Disabled si no hay ítems

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Rediseñar Lista de Ítems - Permisos Empleado vs Admin

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:964-1014`

- [ ] **Step 1: Rediseñar lista de ítems con permisos condicionales**

In `src/components/empleado/EmpMesas.tsx`, replace items list section (lines 964-1012):

```tsx
  {/* Lista de ítems */}
  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
    {selectedMesa.items.length === 0 ? (
      <div style={{
        textAlign: 'center',
        padding: 40,
        color: 'var(--muted)',
      }}>
        Agrega productos al consumo
      </div>
    ) : (
      <>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {selectedMesa.items.map((item, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: '1px solid var(--line)',
              }}
            >
              {/* Solo admin tiene botón [-] */}
              {isAdmin && (
                <button
                  className="icon-btn sm"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--panel2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => {
                    setReduceItem(item);
                    setShowReduceNota(true);
                  }}
                >
                  <Icon name="minus" s={14} />
                </button>
              )}

              {/* Cantidad */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  fontSize: 20,
                  fontWeight: 700,
                  minWidth: 28,
                  textAlign: 'center',
                }}>
                  {item.qty}×
                </span>
                <button
                  className="icon-btn sm"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--panel2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => updateItemQty(item, 1)}
                >
                  <Icon name="plus" s={14} />
                </button>
              </div>

              {/* Info producto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {COP(item.price)} c/u
                </div>
              </div>

              {/* Total */}
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {COP(item.price * item.qty)}
              </div>

              {/* Solo admin tiene botón [X] */}
              {isAdmin && (
                <button
                  className="icon-btn sm"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    color: 'var(--red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => {
                    setSelectedItem(item);
                    setShowRemoveNota(true);
                  }}
                >
                  <Icon name="close" s={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Solo empleados ven mensaje de contactar admin */}
        {!isAdmin && (
          <p style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginTop: 12,
            textAlign: 'center',
            padding: '12px 0',
            borderTop: '1px solid var(--line)',
          }}>
            ¿Agregaste algo por error? Avisa al administrador.
          </p>
        )}
      </>
    )}
  </div>
</div>
```

- [ ] **Step 2: Agregar estilos CSS para botones [-] y [X]**

In `src/components/empleado/EmpMesas.tsx`, update `<style jsx>` block:

```tsx
<style jsx>{`
  .live-dot {
    display: inline-block;
    animation: pulse-live 2s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .mesa-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  .mesa-card.dragging {
    opacity: 0.5;
  }
  .product-card:hover:not([style*="not-allowed"]) {
    border-color: var(--accent);
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .product-card:active:not([style*="not-allowed"]) {
    transform: scale(0.97);
    background: color-mix(in srgb, var(--accent) 12%, var(--panel));
  }
  .btn.primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .btn.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .icon-btn.sm:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .icon-btn.sm[style*="var(--red)"]:hover {
    background: var(--red);
    color: white;
    border-color: var(--red);
  }
  @keyframes productAdd {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    75% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @media (max-width: 768px) {
    .mesa-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .pos-modal {
      grid-template-columns: 1fr !important;
      max-height: 95vh !important;
    }
  }
`}</style>
```

- [ ] **Step 3: Test visual - lista ítems empleado (isAdmin=false)**

Run: `npm run dev`
Login como empleado, open modal POS

Expected:
- Solo botón [+] visible
- NO hay botón [-] ni [X]
- Mensaje "¿Agregaste algo por error? Avisa al administrador."

- [ ] **Step 4: Test visual - lista ítems admin (isAdmin=true)**

Login como admin, open modal POS

Expected:
- Botones [-], [+], [X] visibles
- Botón [X] rojo, hover background rojo
- NO hay mensaje de contactar admin

- [ ] **Step 5: Commit lista ítems con permisos**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): lista ítems con permisos empleado vs admin

Empleado (isAdmin=false):
- Solo botón [+] para incrementar
- Mensaje: contactar admin para errores

Admin (isAdmin=true):
- Botones [-], [+], [X]
- Botón [X] rojo, hover background rojo
- Click [-] o [X] abre modal de motivo

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Crear Componente Modal de Motivo (Reutilizable)

**Files:**
- Create: `src/components/empleado/ModalMotivo.tsx`

- [ ] **Step 1: Crear componente ModalMotivo**

Create `src/components/empleado/ModalMotivo.tsx`:

```typescript
'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';

interface ModalMotivoProps {
  title: string;
  motivos: string[];
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ModalMotivo({
  title,
  motivos,
  onConfirm,
  onCancel,
  loading = false,
}: ModalMotivoProps) {
  const [selectedMotivo, setSelectedMotivo] = useState('');
  const [customMotivo, setCustomMotivo] = useState('');

  const finalMotivo = selectedMotivo === 'Otro' ? customMotivo : selectedMotivo;
  const canConfirm = finalMotivo.trim().length > 0;

  return (
    <Modal title={title} onClose={onCancel}>
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--muted)',
          marginBottom: 10,
        }}>
          Motivo de la acción
        </div>

        {/* Motivos predefinidos */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {motivos.map((motivo) => (
            <div
              key={motivo}
              style={{
                padding: '12px 16px',
                border: selectedMotivo === motivo
                  ? '2px solid var(--accent)'
                  : '1.5px solid var(--line)',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: selectedMotivo === motivo
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
                  : 'var(--panel)',
              }}
              onClick={() => setSelectedMotivo(motivo)}
            >
              <div style={{
                fontSize: 14,
                fontWeight: selectedMotivo === motivo ? 700 : 600,
              }}>
                {motivo}
              </div>
            </div>
          ))}
        </div>

        {/* Textarea si selecciona "Otro" */}
        {selectedMotivo === 'Otro' && (
          <Field label="Especifica el motivo" style={{ marginTop: 12 }}>
            <textarea
              className="inp"
              placeholder="Escribe el motivo..."
              value={customMotivo}
              onChange={(e) => setCustomMotivo(e.target.value)}
              style={{
                width: '100%',
                minHeight: 80,
                resize: 'vertical',
              }}
              autoFocus
            />
          </Field>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          className="btn"
          onClick={onCancel}
          disabled={loading}
          style={{ flex: 1 }}
        >
          Cancelar
        </button>
        <button
          className="btn primary"
          onClick={() => onConfirm(finalMotivo)}
          disabled={!canConfirm || loading}
          style={{
            flex: 1,
            background: 'var(--accent)',
            borderColor: 'var(--accent)',
          }}
        >
          {loading ? 'Procesando...' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar TypeScript sin errores**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 3: Commit componente ModalMotivo**

```bash
git add src/components/empleado/ModalMotivo.tsx
git commit -m "feat(mesas): componente reutilizable ModalMotivo

- Motivos predefinidos seleccionables
- Textarea para motivo custom si selecciona 'Otro'
- Validación: no confirmar si motivo vacío
- Loading state en botón confirmar

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Implementar Modales de Admin (Reducir, Eliminar, Cancelar)

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:1104` (before closing return)

- [ ] **Step 1: Importar ModalMotivo**

In `src/components/empleado/EmpMesas.tsx`, add import at top:

```typescript
import { ModalMotivo } from './ModalMotivo';
```

- [ ] **Step 2: Agregar modal reducir cantidad**

In `src/components/empleado/EmpMesas.tsx`, before closing `</div>` of main component (around line 1104), add:

```tsx
      {/* Modal reducir cantidad (admin) */}
      {isAdmin && showReduceNota && reduceItem && (
        <div style={{ position: 'relative', zIndex: 1001 }}>
          <ModalMotivo
            title={`Reducir cantidad: ${reduceItem.name}`}
            motivos={MOTIVOS_REDUCIR}
            onConfirm={(motivo) => {
              reducirCantidad(reduceItem, reduceQty, motivo);
              setShowReduceNota(false);
              setReduceItem(null);
              setReduceQty(1);
              setReduceMotivo('');
              setReduceMotivoCustom('');
            }}
            onCancel={() => {
              setShowReduceNota(false);
              setReduceItem(null);
              setReduceQty(1);
              setReduceMotivo('');
              setReduceMotivoCustom('');
            }}
          />
        </div>
      )}

      {/* Modal eliminar ítem (admin) */}
      {isAdmin && showRemoveNota && selectedItem && (
        <div style={{ position: 'relative', zIndex: 1001 }}>
          <ModalMotivo
            title={`Eliminar: ${selectedItem.name}`}
            motivos={MOTIVOS_ELIMINAR}
            onConfirm={(motivo) => {
              removeItem(selectedItem, motivo);
              setShowRemoveNota(false);
              setSelectedItem(null);
              setRemoveMotivo('');
              setRemoveMotivoCustom('');
            }}
            onCancel={() => {
              setShowRemoveNota(false);
              setSelectedItem(null);
              setRemoveMotivo('');
              setRemoveMotivoCustom('');
            }}
          />
        </div>
      )}

      {/* Modal cancelar mesa (admin) */}
      {isAdmin && showCancelarNota && selectedMesa && (
        <div style={{ position: 'relative', zIndex: 1001 }}>
          <ModalMotivo
            title={`Cancelar mesa: ${selectedMesa.name}`}
            motivos={MOTIVOS_CANCELAR}
            onConfirm={(motivo) => {
              cancelarMesa(motivo);
              setShowCancelarNota(false);
              setCancelarMotivo('');
              setCancelarMotivoCustom('');
            }}
            onCancel={() => {
              setShowCancelarNota(false);
              setCancelarMotivo('');
              setCancelarMotivoCustom('');
            }}
          />
        </div>
      )}
```

- [ ] **Step 3: Agregar botón "Cancelar mesa" en sticky header (solo admin)**

In `src/components/empleado/EmpMesas.tsx`, in sticky header section of consumo column, after "Cerrar mesa y cobrar" button:

```tsx
    <button
      className="btn primary"
      style={{
        width: '100%',
        padding: '14px 16px',
        fontSize: 15,
        fontWeight: 800,
        background: 'var(--accent)',
        borderColor: 'var(--accent)',
        color: '#fff',
        height: 48,
        borderRadius: 'var(--r-md)',
        transition: 'all 0.15s',
      }}
      disabled={selectedMesa.items.length === 0}
      onClick={() => setShowingCobro(true)}
    >
      Cerrar mesa y cobrar
    </button>

    {/* Botón cancelar mesa (solo admin) */}
    {isAdmin && (
      <button
        className="btn"
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 700,
          marginTop: 8,
          color: 'var(--red)',
          borderColor: 'var(--red)',
          height: 44,
          borderRadius: 'var(--r-md)',
          transition: 'all 0.15s',
        }}
        disabled={selectedMesa.items.length === 0}
        onClick={() => setShowCancelarNota(true)}
      >
        Cancelar mesa sin cobro
      </button>
    )}
```

- [ ] **Step 4: Test funcional - modal reducir cantidad (admin)**

Login como admin, agregar productos, click botón [-]

Expected:
- Modal abre con motivos predefinidos
- Seleccionar "Error del empleado" → Confirmar
- Cantidad se reduce, stock se restaura, toast éxito

- [ ] **Step 5: Test funcional - modal eliminar ítem (admin)**

Login como admin, click botón [X] en ítem

Expected:
- Modal abre con motivos predefinidos
- Seleccionar "Cortesía" → Confirmar
- Ítem eliminado, stock restaurado, toast éxito

- [ ] **Step 6: Test funcional - modal cancelar mesa (admin)**

Login como admin, click "Cancelar mesa sin cobro"

Expected:
- Modal abre con motivos predefinidos
- Seleccionar "Error operativo" → Confirmar
- Mesa liberada, TODO el stock restaurado, modal cierra

- [ ] **Step 7: Verificar audit log en BD**

Run SQL query:

```sql
SELECT * FROM mesa_audit_log ORDER BY created_at DESC LIMIT 10;
```

Expected: Registros de actions con motivos correctos

- [ ] **Step 8: Commit modales admin**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): modales admin para reducir, eliminar, cancelar

- Modal reducir cantidad con motivos predefinidos
- Modal eliminar ítem con motivos predefinidos
- Modal cancelar mesa sin cobro (solo admin)
- Botón cancelar mesa en sticky header (solo admin)
- Integración con audit log

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Rediseñar Modal de Cobro

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:1020-1103`

- [ ] **Step 1: Rediseñar container del modal cobro**

In `src/components/empleado/EmpMesas.tsx`, replace modal cobro section (lines 1020-1103):

```tsx
{/* Modal de cobro */}
{selectedMesa && showingCobro && (
  <Modal title="" onClose={() => setShowingCobro(false)} wide>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          {selectedMesa.name} · {selectedMesa.alias}
        </div>
      </div>

      {/* Card de total */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        padding: 24,
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          color: 'var(--muted)',
          marginBottom: 8,
        }}>
          Total a cobrar
        </div>
        <div style={{
          fontSize: 36,
          fontWeight: 900,
          color: 'var(--accent)',
          marginBottom: 10,
        }}>
          {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {selectedMesa.items.reduce((s, i) => s + i.qty, 0)} productos · {selectedMesa.name} · {selectedMesa.alias}
        </div>
      </div>

      {/* ¿Cómo pagó? */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 10,
        }}>
          ¿Cómo pagó?
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}>
          {PAYMENTS.map(p => (
            <button
              key={p.id}
              className="btn"
              style={{
                height: 52,
                borderRadius: 'var(--r-md)',
                fontSize: 14,
                fontWeight: payment === p.id ? 800 : 700,
                background: payment === p.id
                  ? `color-mix(in srgb, ${p.color} 12%, var(--panel))`
                  : 'var(--panel2)',
                borderColor: payment === p.id ? p.color : 'var(--line)',
                borderWidth: payment === p.id ? '2px' : '1.5px',
                color: payment === p.id ? p.color : 'var(--ink)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => setPayment(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Evidencia (opcional) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 10,
        }}>
          Evidencia (opcional)
        </div>
        <input
          className="inp"
          type="file"
          accept="image/*"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) setEvidenceFile(file);
          }}
          style={{ width: '100%' }}
        />
        {evidenceFile && (
          <div style={{
            fontSize: 12,
            color: 'var(--green)',
            marginTop: 6,
          }}>
            ✓ {evidenceFile.name}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn"
          onClick={() => setShowingCobro(false)}
          style={{ flex: 1 }}
        >
          &gt; Volver
        </button>
        <button
          className="btn primary"
          onClick={cobrarMesa}
          disabled={!payment}
          style={{
            flex: 1,
            background: 'var(--accent)',
            borderColor: 'var(--accent)',
            fontWeight: 800,
          }}
        >
          ✓ Confirmar cobro y liberar mesa
        </button>
      </div>
    </div>
  </Modal>
)}
```

- [ ] **Step 2: Test visual - modal cobro**

Run: `npm run dev`
Open modal POS, click "Cerrar mesa y cobrar"

Expected:
- Card de total: background bg2, monto 36px accent
- Grid 2×3 métodos de pago
- Seleccionado: border 2px color método, background método 12%
- Input file evidencia con confirmación ✓

- [ ] **Step 3: Test interacción - seleccionar método de pago**

Click en cada método de pago

Expected:
- Border cambia a color del método
- Background tinte del color del método
- Font-weight 800 cuando seleccionado

- [ ] **Step 4: Commit modal cobro rediseñado**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): rediseñar modal de cobro - estilo POS

- Card de total: background bg2, monto 36px accent
- Grid 2 columnas métodos de pago
- Seleccionado: border 2px + background tinte
- Colores por método: efectivo green, transferencia blue, etc
- Input evidencia con confirmación ✓

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Implementar Animaciones y Micro-Interacciones

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:225` (addToCart function)
- Modify: `src/components/empleado/EmpMesas.tsx:1106` (style block)

- [ ] **Step 1: Agregar animación productAdd al agregar producto**

In `src/components/empleado/EmpMesas.tsx`, update `addToCart` function to trigger animation:

After successful add (after mesa_items insert), add:

```typescript
  // 4. Agregar a mesa_items
  const existing = selectedMesa.items.find(i => i.product_id === product.id);
  if (existing) {
    const newQty = existing.qty + 1;
    await supabase
      .from('mesa_items')
      .update({ qty: newQty })
      .eq('mesa_id', selectedMesa.id)
      .eq('product_id', product.id);
  } else {
    await supabase.from('mesa_items').insert({
      mesa_id: selectedMesa.id,
      product_id: product.id,
      qty: 1,
      unit_price: product.price,
      unit_cost: product.cost,
    });
  }

  // 5. Trigger animation
  const card = document.querySelector(`[data-product-id="${product.id}"]`);
  if (card) {
    card.classList.add('product-add-animation');
    setTimeout(() => card.classList.remove('product-add-animation'), 200);
  }
}
```

- [ ] **Step 2: Agregar data-product-id a product cards**

In `src/components/empleado/EmpMesas.tsx`, update product card div:

```tsx
<div
  key={p.id}
  data-product-id={p.id}
  className="product-card"
  style={{
    // ... existing styles
  }}
  onClick={() => p.stock > 0 && addToCart(p)}
>
```

- [ ] **Step 3: Agregar animación totalFlash al cambiar total**

Add state for total flash animation:

```typescript
const [totalFlash, setTotalFlash] = useState(false);
```

In `addToCart` function, after successful add:

```typescript
  // 6. Trigger total flash
  setTotalFlash(true);
  setTimeout(() => setTotalFlash(false), 300);
}
```

In sticky header consumo, update total div:

```tsx
<div
  className={totalFlash ? 'total-flash' : ''}
  style={{
    fontSize: 28,
    fontWeight: 900,
    color: 'var(--accent)',
    letterSpacing: '-0.03em',
    marginBottom: 16,
  }}
>
  {COP(selectedMesa.items.reduce((s, i) => s + i.price * i.qty, 0))}
</div>
```

- [ ] **Step 4: Actualizar CSS con todas las animaciones**

In `src/components/empleado/EmpMesas.tsx`, update `<style jsx>` block with complete animations:

```tsx
<style jsx>{`
  .live-dot {
    display: inline-block;
    animation: pulse-live 2s ease-in-out infinite;
  }
  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .mesa-card {
    transition: all 0.3s ease;
  }
  .mesa-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  .mesa-card.dragging {
    opacity: 0.5;
  }
  .product-card {
    transition: all 0.12s ease;
  }
  .product-card:hover:not([style*="not-allowed"]) {
    border-color: var(--accent);
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .product-card:active:not([style*="not-allowed"]) {
    transform: scale(0.97);
    background: color-mix(in srgb, var(--accent) 12%, var(--panel));
  }
  .product-add-animation {
    animation: productAdd 200ms ease;
  }
  @keyframes productAdd {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    75% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  .total-flash {
    animation: totalFlash 300ms ease;
  }
  @keyframes totalFlash {
    0% { color: var(--ink); }
    50% { color: var(--accent); }
    100% { color: var(--ink); }
  }
  .btn.primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  .btn.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .icon-btn.sm {
    transition: all 0.15s;
  }
  .icon-btn.sm:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .icon-btn.sm[style*="var(--red)"]:hover {
    background: var(--red);
    color: white;
    border-color: var(--red);
  }
  @media (max-width: 768px) {
    .mesa-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .pos-modal {
      grid-template-columns: 1fr !important;
      max-height: 95vh !important;
    }
  }
`}</style>
```

- [ ] **Step 5: Test animación productAdd**

Run: `npm run dev`
Click en producto

Expected:
- Product card: scale 0.95 → 1.05 → 1 (200ms)
- Animación suave y visible

- [ ] **Step 6: Test animación totalFlash**

Agregar producto

Expected:
- Total cambia color a accent por 150ms, luego vuelve a ink
- Flash visible pero no molesto

- [ ] **Step 7: Commit animaciones**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): animaciones y micro-interacciones

- productAdd: scale 0.95 → 1.05 → 1 (200ms) al agregar
- totalFlash: color flash accent 300ms al cambiar total
- pulse-live: chip EN VIVO opacity 1 → 0.4 → 1 (2s loop)
- Transiciones smooth en mesa cards (0.3s)
- Hover/active states en todos los botones

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Responsive Mobile - Media Queries

**Files:**
- Modify: `src/components/empleado/EmpMesas.tsx:1106` (style block)

- [ ] **Step 1: Actualizar media queries para mobile**

In `src/components/empleado/EmpMesas.tsx`, update `<style jsx>` mobile section:

```tsx
  @media (max-width: 768px) {
    .header-strip {
      flex-direction: column !important;
      gap: 12px;
      align-items: flex-start !important;
    }
    .header-strip > div:nth-child(2) {
      max-width: 100% !important;
    }
    .mesa-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px !important;
    }
    .pos-modal {
      width: 100vw !important;
      height: 100vh !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
      grid-template-columns: 1fr !important;
    }
    .pos-modal > div:first-child {
      display: none;
    }
    .product-card {
      padding: 10px !important;
    }
  }
```

- [ ] **Step 2: Agregar tabs catálogo/consumo en mobile**

In `src/components/empleado/EmpMesas.tsx`, add mobile tabs state:

```typescript
const [mobileTab, setMobileTab] = useState<'catalogo' | 'consumo'>('catalogo');
```

In modal POS, after header, add mobile tabs (only visible in mobile):

```tsx
{/* Tabs mobile */}
<div className="mobile-tabs" style={{
  display: 'none',
  gridColumn: '1 / -1',
}}>
  <button
    className={mobileTab === 'catalogo' ? 'active' : ''}
    onClick={() => setMobileTab('catalogo')}
  >
    Catálogo
  </button>
  <button
    className={mobileTab === 'consumo' ? 'active' : ''}
    onClick={() => setMobileTab('consumo')}
  >
    Consumo ({selectedMesa.items.reduce((s, i) => s + i.qty, 0)})
  </button>
</div>
```

Update catálogo column to hide/show based on mobile tab:

```tsx
<div
  className="catalogo-column"
  style={{
    borderRight: '1px solid var(--line)',
    display: mobileTab === 'catalogo' ? 'flex' : 'none',
    flexDirection: 'column',
    maxHeight: '88vh',
    background: 'var(--bg2)',
  }}
>
```

Update consumo column similarly:

```tsx
<div
  className="consumo-column"
  style={{
    display: mobileTab === 'consumo' ? 'flex' : 'none',
    flexDirection: 'column',
    maxHeight: '88vh',
    background: 'var(--panel)',
  }}
>
```

- [ ] **Step 3: Agregar estilos CSS para mobile tabs**

In `<style jsx>` block, add mobile tabs styles:

```tsx
  .mobile-tabs {
    border-bottom: 1px solid var(--line);
    background: var(--panel);
  }
  .mobile-tabs button {
    flex: 1;
    padding: 12px;
    text-align: center;
    font-weight: 700;
    border: none;
    background: transparent;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mobile-tabs button.active {
    border-bottom-color: var(--accent);
    color: var(--accent);
  }
  @media (max-width: 768px) {
    .mobile-tabs {
      display: flex !important;
    }
    .catalogo-column,
    .consumo-column {
      display: flex !important;
    }
  }
```

- [ ] **Step 4: Test responsive - 375px width**

Run: `npm run dev`
Resize browser to 375px

Expected:
- Header: stack vertical
- Grid mesas: 2 columnas
- Modal POS: fullscreen, tabs visibles
- Tab catálogo: muestra catálogo, oculta consumo
- Tab consumo: muestra consumo, oculta catálogo

- [ ] **Step 5: Test responsive - 768px width**

Resize to 768px

Expected:
- Tabs NO visibles
- Grid catálogo y consumo lado a lado

- [ ] **Step 6: Commit responsive mobile**

```bash
git add src/components/empleado/EmpMesas.tsx
git commit -m "feat(mesas): responsive mobile con tabs catálogo/consumo

Media queries:
- Header: stack vertical < 768px
- Grid mesas: 2 columnas en mobile
- Modal POS: fullscreen en mobile
- Tabs catálogo/consumo solo en mobile
- Product cards: padding reducido

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 18: Testing Manual Completo y Pulido

**Files:**
- None (testing only)

- [ ] **Step 1: Test flujo completo empleado**

1. Login como empleado
2. Abrir mesa libre → agregar alias → abrir
3. Modal POS abre automáticamente
4. Agregar 5 productos diferentes
5. Incrementar cantidad de 2 productos
6. Intentar decrementar → toast "Contacta al administrador"
7. Cerrar mesa y cobrar → seleccionar método pago → confirmar

Expected:
- Flujo sin errores
- Stock descontado correctamente
- Mesa liberada
- Sale creada en BD

- [ ] **Step 2: Test flujo completo admin**

1. Login como admin
2. Abrir mesa → agregar productos
3. Click [-] en un ítem → modal motivo → confirmar
4. Verificar: cantidad reducida, stock restaurado
5. Click [X] en un ítem → modal motivo → confirmar
6. Verificar: ítem eliminado, stock restaurado
7. Agregar más productos
8. Click "Cancelar mesa sin cobro" → modal motivo → confirmar
9. Verificar: mesa liberada, TODO el stock restaurado

Expected:
- Todos los modales funcionan
- Audit log registra acciones
- Stock restaurado correctamente

- [ ] **Step 3: Test bug stock eliminado**

1. Abrir modal POS
2. En otra sesión, cambiar stock de producto en BD
3. Verificar: badge stock NO actualiza en modal abierto
4. Cerrar modal, reabrir
5. Verificar: stock actualizado

Expected:
- No hay Realtime update de products en modal
- Stock actualiza al recargar

- [ ] **Step 4: Test animaciones**

1. Agregar producto → verificar animación productAdd
2. Verificar: total flash accent
3. Verificar: chip EN VIVO pulsa
4. Hover sobre mesa card → verificar transform
5. Hover sobre product card → verificar scale 1.02

Expected:
- Todas las animaciones visibles y suaves

- [ ] **Step 5: Test responsive mobile**

1. Resize a 375px
2. Verificar: header vertical, grid 2 columnas
3. Abrir modal POS
4. Verificar: fullscreen, tabs visibles
5. Switch entre tabs catálogo/consumo

Expected:
- Responsive funciona en todos los breakpoints

- [ ] **Step 6: Test drag & drop mesas**

1. Drag mesa card
2. Drop en otra posición
3. Reload page
4. Verificar: orden persistido en localStorage

Expected:
- Drag & drop funciona
- Orden persiste

- [ ] **Step 7: Verificar performance**

Run: `npm run build && npm start`
Navigate to mesas page

Check:
- Time to Interactive < 2s
- No console errors
- No memory leaks (open/close modal 10 veces)

Expected:
- Performance aceptable
- Sin errores

- [ ] **Step 8: Code review self-check**

Review:
- [ ] No placeholders (TBD, TODO)
- [ ] No console.logs
- [ ] No unused imports
- [ ] No any types
- [ ] All functions have proper error handling

Expected:
- Código limpio y profesional

- [ ] **Step 9: Commit testing complete**

```bash
git commit --allow-empty -m "test(mesas): testing manual completo - rediseño aprobado

Flujos testeados:
✓ Empleado: agregar productos, cobrar
✓ Admin: reducir qty, eliminar, cancelar mesa
✓ Bug stock eliminado (no Realtime products)
✓ Animaciones: productAdd, totalFlash, pulse-live
✓ Responsive: mobile tabs, grid 2 columnas
✓ Drag & drop con localStorage
✓ Performance: TTI < 2s, no memory leaks

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Migración mesa_audit_log
- ✅ Prop isAdmin
- ✅ Eliminar Realtime products
- ✅ Optimistic updates (addToCart, removeItem, cancelarMesa)
- ✅ Funciones admin (reducir, eliminar, cancelar)
- ✅ Header 3 zonas
- ✅ Tarjetas mesa rediseñadas
- ✅ Modal POS rediseñado
- ✅ Product cards con badge stock
- ✅ Columna consumo con permisos
- ✅ Modales de motivo admin
- ✅ Modal cobro rediseñado
- ✅ Animaciones (productAdd, totalFlash, pulse-live)
- ✅ Responsive mobile con tabs

**Placeholders scan:**
- ✅ No TBD, TODO, "implement later"
- ✅ No "add appropriate error handling" sin código
- ✅ No "write tests" sin test code
- ✅ No "similar to Task N" sin repetir código

**Type consistency:**
- ✅ `isAdmin: boolean` consistente en toda la app
- ✅ `CartItem` interface consistente
- ✅ Funciones `removeItem`, `reducirCantidad`, `cancelarMesa` usan misma firma

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-07-empmesas-rediseno.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
