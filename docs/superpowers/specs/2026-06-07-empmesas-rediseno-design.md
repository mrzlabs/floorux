# Diseño: Rediseño Completo EmpMesas.tsx - Centro de Operaciones Nocturno

**Fecha:** 2026-06-07  
**Objetivo:** Transformar el módulo de mesas empleado en un centro de operaciones nocturno con estética Toast POS + Square POS + Linear + Stripe Dashboard.  
**Alcance:** Rediseño visual completo + fix definitivo bug de stock + permisos empleado vs admin.

---

## 1. Contexto y Motivación

### Estado Actual
`EmpMesas.tsx` es funcional pero tiene:
- Bug crítico: doble conteo de stock al revertir ítems (Realtime `products` interfiere con optimistic updates)
- Diseño visual genérico, no transmite "centro de operaciones nocturno"
- Falta de permisos granulares: empleados pueden reducir/eliminar sin auditoría

### Objetivo del Rediseño
Convertir `EmpMesas.tsx` en un **centro de control POS moderno** que:
- Transmita urgencia y claridad (inspiración: Toast POS, Square POS)
- Elimine completamente el bug de stock con arquitectura más simple
- Implemente permisos claros: empleado agrega/cobra, admin tiene control total con auditoría

---

## 2. Arquitectura y Gestión de Estado

### 2.1 Props del Componente

```typescript
interface EmpMesasProps {
  comercioId: string;
  empleadoId: string;
  shiftId: string | null;
  isAdmin: boolean; // NUEVA PROP
}
```

### 2.2 Cambios en Estado

**Eliminar completamente:**
```typescript
// ELIMINAR estas líneas (94-102 actuales)
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

**Mantener:**
- Realtime de `mesas` (cambios de status, alias, etc.)
- Realtime de `mesa_items` (cambios en consumo)
- **NO** Realtime de `products` (causa doble conteo)

### 2.3 Flujo de Stock - Optimistic Updates

**addToCart(product):**
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

  // 2. Persistir en BD (async, fire-and-forget con validación)
  const { error } = await supabase
    .from('products')
    .update({ stock: product.stock - 1 })
    .eq('id', product.id)
    .gt('stock', 0); // Validación: solo si stock > 0

  if (error) {
    // 3. Revertir si falla
    setProducts(prev => prev.map(p => 
      p.id === product.id 
        ? { ...p, stock: p.stock + 1 } 
        : p
    ));
    toast('Error al actualizar inventario', 'alert');
    return;
  }

  // 4. Agregar a mesa_items (lógica actual)
  // ...
}
```

**removeItem (solo admin):**
```typescript
async function removeItem(item: CartItem, motivo: string) {
  if (!selectedMesa) return;

  // 1. Optimistic update: restaurar stock inmediatamente
  setProducts(prev => prev.map(p => 
    p.id === item.product_id 
      ? { ...p, stock: p.stock + item.qty } 
      : p
  ));

  // 2. Persistir en BD
  await supabase
    .from('products')
    .update({ stock: product.stock + item.qty })
    .eq('id', item.product_id);

  // 3. Eliminar de mesa_items
  await supabase
    .from('mesa_items')
    .delete()
    .eq('mesa_id', selectedMesa.id)
    .eq('product_id', item.product_id);

  // 4. Audit log
  await supabase.from('mesa_audit_log').insert({
    mesa_id: selectedMesa.id,
    action: 'remove_item',
    product_id: item.product_id,
    qty: item.qty,
    motivo,
    admin_id: empleadoId,
  });
}
```

**cancelarMesa (solo admin):**
```typescript
async function cancelarMesa(motivo: string) {
  if (!selectedMesa) return;

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

### 2.4 Audit Log (nueva tabla)

```sql
CREATE TABLE mesa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID NOT NULL REFERENCES mesas(id),
  action TEXT NOT NULL, -- 'remove_item', 'reduce_qty', 'cancel_mesa'
  product_id UUID REFERENCES products(id),
  qty INT,
  motivo TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Diseño Visual - Header y Vista Principal

### 3.1 Header Strip (Banda Completa)

**Layout:**
```css
background: var(--panel)
border-bottom: 1px solid var(--line)
padding: 16px 20px
display: flex
align-items: center
justify-content: space-between
margin-bottom: 20px
```

**Estructura horizontal:**

**Zona Izquierda:**
```
Label: "VENTA DE LA NOCHE"
  font-size: 11px
  text-transform: uppercase
  letter-spacing: 0.06em
  color: var(--muted)
  margin-bottom: 4px

Monto: "$XX.XXX"
  font-size: 28px
  font-weight: 900
  color: var(--accent)

Subtexto: "X cobradas · Y abiertas"
  font-size: 12px
  color: var(--muted)
```

**Zona Centro:**
```
Barra de barras (stacked bar chart inline):
  display: flex
  gap: 3px
  max-width: 400px
  height: 32px
  border-radius: 4px
  overflow: hidden
  background: var(--panel)

Cada barra (por mesa abierta):
  display: inline-block
  height: 100%
  width: calculado como (mesaTotal / totalAcumulado) * 100%
  background: linear-gradient(90deg, var(--accent), var(--accent2))
  
Tooltip nativo (title):
  "Mesa X: $XX.XXX"
```

**Zona Derecha:**
```
Chip "● EN VIVO" (solo si shift existe):
  background: color-mix(in srgb, var(--green) 20%, transparent)
  color: var(--green)
  padding: 6px 12px
  border-radius: 99px
  font-size: 11px
  font-weight: 700
  
  animation: pulse-live 2s infinite ease-in-out
  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

Cronómetro: "01:34:50"
  font-size: 18px
  font-weight: 700
  font-feature-settings: '"tnum"'
  
Label: "turno en curso"
  font-size: 11px
  color: var(--muted)
```

### 3.2 Filtros (Segunda Línea)

```css
display: flex
justify-content: space-between
align-items: center
margin-bottom: 16px

/* Chips izquierda */
Chips: "Todas (N)" | "Abiertas (N)" | "Libres (N)"

Activo:
  background: var(--accent)
  border-color: var(--accent)
  color: white
  font-weight: 700

Inactivo:
  background: var(--panel2)
  border: 1px solid var(--line)
  color: var(--ink)

/* Botón derecha */
"+ Crear mesa"
  className: btn sm
```

### 3.3 Grid de Mesas

```css
display: grid
grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))
gap: 14px
padding: 0
```

---

## 4. Diseño Visual - Tarjetas de Mesa

### 4.1 Mesa Libre

```css
border-radius: var(--r-lg)
background: var(--panel)
border: 1px solid var(--line)
min-height: 160px
display: flex
flex-direction: column
position: relative
cursor: pointer
transition: all 0.15s ease

/* Badge LIBRE - esquina superior derecha */
.badge-libre {
  position: absolute
  top: 10px
  right: 10px
  background: var(--panel3)
  color: var(--muted)
  font-size: 10px
  font-weight: 800
  padding: 3px 8px
  border-radius: 99px
  text-transform: uppercase
  letter-spacing: 0.06em
}

/* Nombre mesa - esquina superior izquierda */
.mesa-name {
  position: absolute
  top: 10px
  left: 12px
  font-size: 13px
  font-weight: 700
  color: var(--ink)
}

/* Centro */
.mesa-libre-content {
  flex: 1
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  gap: 8px
}

Ícono "+": 32px, color: var(--muted)
Texto "Abrir": 12px, color: var(--muted)

/* Hover */
&:hover {
  border-color: var(--accent)
  background: color-mix(in srgb, var(--accent) 6%, var(--panel))
  transform: translateY(-1px)
  box-shadow: 0 8px 24px rgba(0,0,0,0.2)
}
```

### 4.2 Mesa Abierta

```css
background: color-mix(in srgb, var(--accent) 8%, var(--panel))
border: 2px solid var(--accent)
box-shadow: 
  0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent),
  0 8px 32px color-mix(in srgb, var(--accent) 20%, transparent)
position: relative
overflow: hidden
min-height: 160px
padding: 16px
cursor: pointer
transition: all 0.3s ease

/* Barra de progreso en el fondo */
.progress-bar {
  position: absolute
  bottom: 0
  left: 0
  height: 3px
  background: linear-gradient(to right, var(--accent), var(--accent2))
  width: calculado como min((mesaTotal / 200000) * 100%, 100%)
}

/* Badge ABIERTA */
.badge-abierta {
  position: absolute
  top: 10px
  right: 10px
  background: var(--accent)
  color: white
  font-size: 10px
  font-weight: 800
  padding: 3px 8px
  border-radius: 99px
  text-transform: uppercase
  letter-spacing: 0.06em
}

/* Contenido */
Nombre: 13px, font-weight: 700
Alias: 11px, color: var(--muted), margin-bottom: 10px
Monto: 24px, font-weight: 800, color: var(--ink), letter-spacing: -0.03em
Info: "⏱ 1h 17m · 4 ítems" — 11px, color: var(--muted)

/* Chips de productos (máximo 3 + contador) */
.product-chips {
  display: flex
  gap: 4px
  flex-wrap: wrap
  margin-top: 10px
}

.product-chip {
  height: 22px
  font-size: 10px
  font-weight: 700
  background: color-mix(in srgb, var(--accent) 20%, transparent)
  color: var(--accent)
  border-radius: 99px
  padding: 0 8px
  display: flex
  align-items: center
}

.product-chip-more {
  background: var(--accent)
  color: white
}
```

### 4.3 Tarjeta "Nueva Mesa"

```css
border: 2px dashed var(--line2)
background: transparent
min-height: 160px
display: flex
flex-direction: column
align-items: center
justify-content: center
gap: 8px
cursor: pointer
transition: all 0.15s ease
border-radius: var(--r-lg)

Ícono "+": 32px, color: var(--muted)
Texto "Nueva mesa": 14px, font-weight: 600, color: var(--muted)

&:hover {
  border-color: var(--accent)
  background: color-mix(in srgb, var(--accent) 4%, transparent)
}
```

---

## 5. Diseño Visual - Modal POS

### 5.1 Container del Modal

```css
/* Desktop */
width: 90vw
max-width: 1200px
height: 88vh
border-radius: 22px
overflow: hidden
display: grid
grid-template-columns: 1fr 380px
background: var(--panel)
border: 1px solid var(--line2)

/* Mobile */
@media (max-width: 768px) {
  width: 100vw
  height: 100vh
  border-radius: 0
  grid-template-columns: 1fr
}
```

### 5.2 Header del Modal

```css
height: 56px
background: var(--panel2)
border-bottom: 1px solid var(--line)
padding: 0 20px
display: flex
align-items: center
justify-content: space-between
grid-column: 1 / -1

Izquierda:
  display: flex
  align-items: center
  gap: 10px
  
  Ícono mesa: 18px
  "Mesa X · alias": 18px, font-weight: 800

Derecha:
  Botón X cerrar (icon-btn)
```

### 5.3 Columna Izquierda - Catálogo

```css
background: var(--bg2)
overflow-y: auto
display: flex
flex-direction: column

/* Barra de búsqueda */
.search-container {
  margin: 14px
  background: var(--panel)
  border: 1px solid var(--line)
  border-radius: var(--r-md)
  padding: 10px 14px
  position: relative
}

Ícono search: position absolute, left 12px
Input: 
  border: none
  background: transparent
  padding-left: 36px
  width: 100%

/* Chips de categoría */
.category-chips {
  display: flex
  gap: 8px
  padding: 0 14px 12px
  overflow-x: auto
}

Chip activo:
  background: var(--accent)
  color: white
  border: none
  height: 32px
  padding: 0 16px
  border-radius: var(--r-md)
  font-weight: 700
  font-size: 13px

Chip inactivo:
  background: var(--panel)
  color: var(--muted)
  border: 1px solid var(--line)

/* Grid de productos */
.products-grid {
  padding: 0 14px 14px
  display: grid
  grid-template-columns: repeat(2, 1fr)
  gap: 10px
}
```

### 5.4 Product Card

```css
background: var(--panel)
border: 1px solid var(--line)
border-radius: var(--r-md)
padding: 12px
cursor: pointer
position: relative
transition: all 0.12s ease

/* Badge stock - esquina superior derecha */
.stock-badge {
  position: absolute
  top: 8px
  right: 8px
  width: 24px
  height: 24px
  border-radius: 50%
  font-size: 11px
  font-weight: 800
  display: flex
  align-items: center
  justify-content: center
  
  /* Stock normal */
  background: var(--panel3)
  color: var(--ink)
  
  /* Stock bajo (stock <= min_stock) */
  background: #f59e42
  color: white
  
  /* Stock 0 */
  background: var(--red)
  color: white
}

/* Hover (solo si stock > 0) */
&:hover {
  border-color: var(--accent)
  transform: scale(1.02)
  box-shadow: 0 4px 16px rgba(0,0,0,0.15)
}

/* Active (click) */
&:active {
  transform: scale(0.97)
  background: color-mix(in srgb, var(--accent) 12%, var(--panel))
}

/* AGOTADO overlay (stock === 0) */
.agotado-overlay {
  position: absolute
  inset: 0
  background: color-mix(in srgb, var(--red) 12%, transparent)
  border: 1px solid var(--red)
  border-radius: var(--r-md)
  display: flex
  align-items: center
  justify-content: center
  font-size: 13px
  font-weight: 800
  color: var(--red)
  pointer-events: none
  cursor: not-allowed
  opacity: 0.6
}

/* Contenido */
Nombre: 
  13px, font-weight: 700
  display: -webkit-box
  -webkit-line-clamp: 2
  -webkit-box-orient: vertical
  overflow: hidden
  
Subcategoría + unidad: 
  11px, color: var(--muted)
  margin-bottom: 6px
  
Precio: 
  15px, font-weight: 800, color: var(--ink)
  text-decoration: line-through (si stock === 0)
  opacity: 0.4 (si stock === 0)
```

### 5.5 Columna Derecha - Consumo

```css
background: var(--panel)
border-left: 1px solid var(--line)
display: flex
flex-direction: column
max-height: 90vh
```

**Sticky Header:**

```css
position: sticky
top: 0
z-index: 10
background: var(--panel)
border-bottom: 1px solid var(--line)
padding: 16px 20px

Label "CONSUMO":
  font-size: 10px
  text-transform: uppercase
  letter-spacing: 0.06em
  color: var(--muted)
  margin-bottom: 6px
  
"X ítems":
  font-size: 13px
  color: var(--muted)
  margin-bottom: 10px

Total:
  font-size: 28px
  font-weight: 900
  color: var(--accent)
  letter-spacing: -0.03em
  margin-bottom: 16px

Botón "Cerrar mesa y cobrar":
  width: 100%
  height: 48px
  background: var(--accent)
  border: none
  border-radius: var(--r-md)
  color: white
  font-weight: 800
  font-size: 15px
  cursor: pointer
  transition: all 0.15s
  
  &:hover {
    filter: brightness(1.1)
    transform: translateY(-1px)
  }
  
  &:disabled {
    opacity: 0.5
    cursor: not-allowed
  }
```

**Lista de Ítems:**

```css
flex: 1
overflow-y: auto
padding: 12px 20px
```

**Ítem EMPLEADO (isAdmin=false):**

```css
display: flex
align-items: center
gap: 12px
padding: 10px 0
border-bottom: 1px solid var(--line)

Layout: [ cantidad ] [ + ] nombre precio_c/u total

.qty-display {
  font-size: 20px
  font-weight: 700
  min-width: 28px
  text-align: center
}

.btn-plus {
  width: 28px
  height: 28px
  border-radius: 50%
  background: var(--panel2)
  border: 1px solid var(--line)
  display: flex
  align-items: center
  justify-content: center
  cursor: pointer
  transition: all 0.15s
  
  &:hover {
    border-color: var(--accent)
    color: var(--accent)
  }
}

.item-info {
  flex: 1
  min-width: 0
}

.item-name {
  font-size: 13px
  font-weight: 700
}

.item-price {
  font-size: 11px
  color: var(--muted)
}

.item-total {
  font-size: 14px
  font-weight: 800
}
```

**Ítem ADMIN (isAdmin=true):**

```css
Layout: [ - ] [ cantidad ] [ + ] nombre precio_c/u total [ X ]

.btn-minus {
  /* igual que .btn-plus */
}

.btn-remove {
  width: 28px
  height: 28px
  border-radius: 50%
  background: transparent
  border: 1px solid var(--line)
  color: var(--red)
  display: flex
  align-items: center
  justify-content: center
  cursor: pointer
  transition: all 0.15s
  
  &:hover {
    background: var(--red)
    color: white
    border-color: var(--red)
  }
}
```

**Mensaje al pie (isAdmin=false):**

```css
padding: 12px 0
border-top: 1px solid var(--line)
font-size: 12px
color: var(--muted)
text-align: center

Texto: "¿Agregaste algo por error? Avisa al administrador."
```

---

## 6. Diseño Visual - Modal de Cobro

```css
background: var(--panel)
border-radius: 22px
padding: 28px
max-width: 480px

/* Header */
.cobro-header {
  display: flex
  align-items: center
  justify-content: space-between
  margin-bottom: 16px
}

"Mesa X · alias": 18px, font-weight: 800
Botón X: icon-btn

/* Card de Total */
.total-card {
  background: var(--bg2)
  border: 1px solid var(--line)
  border-radius: var(--r-md)
  padding: 24px
  text-align: center
  margin-bottom: 20px
}

Label "Total a cobrar":
  font-size: 12px
  text-transform: uppercase
  letter-spacing: 0.06em
  color: var(--muted)
  margin-bottom: 8px

Monto:
  font-size: 36px
  font-weight: 900
  color: var(--accent)
  margin-bottom: 10px

Detalle "X productos · Mesa X · alias":
  font-size: 13px
  color: var(--muted)

/* Sección "¿Cómo pagó?" */
Label:
  font-size: 13px
  font-weight: 700
  margin-bottom: 10px

.payment-methods {
  display: grid
  grid-template-columns: repeat(2, 1fr)
  gap: 8px
}

.payment-btn {
  height: 52px
  border-radius: var(--r-md)
  font-size: 14px
  font-weight: 700
  display: flex
  align-items: center
  justify-content: center
  cursor: pointer
  transition: all 0.15s
  
  /* No seleccionado */
  background: var(--panel2)
  border: 1.5px solid var(--line)
  color: var(--ink)
  
  /* Seleccionado */
  &.selected {
    border: 2px solid var(--color-metodo)
    background: color-mix(in srgb, var(--color-metodo) 12%, var(--panel))
    color: var(--color-metodo)
    font-weight: 800
  }
}

Colores por método:
  Efectivo: var(--green)
  Transferencia: var(--blue)
  QR: var(--accent3)
  Datáfono: var(--accent2)
  Nequi/Daviplata: var(--yellow)

/* Evidencia */
Label: 13px, font-weight: 700, margin-bottom: 10px
Input file: className inp, accept="image/*", width 100%

Si hay archivo:
  "✓ nombre.jpg": 12px, color var(--green), margin-top 6px

/* Footer */
.cobro-footer {
  display: flex
  gap: 8px
  margin-top: 24px
}

Botón "Volver": flex 1, className btn
Botón "Confirmar cobro y liberar mesa": 
  flex 1
  className btn primary
  background: var(--accent)
  border-color: var(--accent)
  color: white
  font-weight: 800
  disabled si !payment
```

---

## 7. Animaciones y Micro-Interacciones

### 7.1 Al Agregar Producto al Consumo

**Tarjeta del producto:**
```css
@keyframes productAdd {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  75% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Aplicar en el onClick */
animation: productAdd 200ms ease
```

**Total en columna derecha:**
```css
@keyframes totalFlash {
  0% { color: var(--ink); }
  50% { color: var(--accent); }
  100% { color: var(--ink); }
}

/* Aplicar cuando cambia el total */
animation: totalFlash 300ms ease
```

### 7.2 Transición Mesa Libre → Abierta

```css
transition: all 0.3s ease

/* Background, border, box-shadow cambian gradualmente */
```

### 7.3 Cronómetro del Turno

```typescript
useEffect(() => {
  if (!shift?.started_at) return;
  
  const interval = setInterval(() => {
    const start = new Date(shift.started_at).getTime();
    const now = Date.now();
    const diff = now - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setElapsedTime(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  }, 1000);
  
  return () => clearInterval(interval);
}, [shift]);
```

```css
font-feature-settings: '"tnum"'
font-family: monospace
```

### 7.4 Chip "EN VIVO" Pulsante

```css
@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.live-dot {
  display: inline-block
  animation: pulse-live 2s infinite ease-in-out
}
```

### 7.5 Draggable - Estados Visuales

**Durante drag:**
```css
.dragging {
  opacity: 0.5
}
```

**Drop target:**
```css
.drop-target {
  border: 2px dashed var(--accent)
  background: color-mix(in srgb, var(--accent) 4%, var(--panel))
}
```

**Guardar orden:**
```typescript
localStorage.setItem(
  `mesa-order-${comercioId}`, 
  JSON.stringify(mesaOrder)
);
```

---

## 8. Permisos y Flujos - Empleado vs Admin

### 8.1 Permisos por Rol

| Acción | Empleado (isAdmin=false) | Admin (isAdmin=true) |
|--------|--------------------------|----------------------|
| Ver productos | ✅ | ✅ |
| Agregar productos | ✅ | ✅ |
| Aumentar cantidad (+) | ✅ | ✅ |
| Reducir cantidad (-) | ❌ | ✅ (con modal motivo) |
| Eliminar ítem (X) | ❌ | ✅ (con modal motivo) |
| Cerrar mesa y cobrar | ✅ | ✅ |
| Cancelar mesa sin cobrar | ❌ | ✅ (con modal motivo) |
| Ver audit log | ❌ | ✅ (en AdminMesas) |

### 8.2 Modal de Motivo (Admin)

**Estructura:**
```typescript
interface MotivoModal {
  title: string;
  motivos: string[];
  onConfirm: (motivo: string) => void;
}

// Motivos predefinidos por acción
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

**Diseño del modal:**
```css
max-width: 400px
padding: 24px
border-radius: var(--r-lg)

Title: 18px, font-weight 800, margin-bottom 16px

/* Motivos */
display: flex
flex-direction: column
gap: 8px

.motivo-option {
  padding: 12px 16px
  border: 1.5px solid var(--line)
  border-radius: var(--r-md)
  cursor: pointer
  transition: all 0.15s
  
  &.selected {
    border-color: var(--accent)
    background: color-mix(in srgb, var(--accent) 8%, var(--panel))
  }
}

/* Si selecciona "Otro" */
textarea.inp:
  width: 100%
  min-height: 80px
  margin-top: 8px

/* Footer */
display: flex
gap: 8px
margin-top: 20px

Botón "Cancelar": flex 1, className btn
Botón "Confirmar": 
  flex 1
  className btn primary
  disabled si !motivo
```

### 8.3 Flujo Reducir Cantidad (Admin)

```typescript
async function reducirCantidad(item: CartItem, qty: number, motivo: string) {
  if (!selectedMesa) return;
  
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
  
  // 2. Persistir en BD
  await supabase
    .from('products')
    .update({ stock: product.stock + qty })
    .eq('id', item.product_id);
  
  // 3. Actualizar mesa_items
  await supabase
    .from('mesa_items')
    .update({ qty: newQty })
    .eq('mesa_id', selectedMesa.id)
    .eq('product_id', item.product_id);
  
  // 4. Audit log
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

### 8.4 Botones Condicionales en UI

```tsx
{/* Lista de ítems */}
{selectedMesa.items.map((item, idx) => (
  <div key={idx} className="item-row">
    {/* Solo admin tiene botón [-] */}
    {isAdmin && (
      <button 
        className="btn-minus"
        onClick={() => {
          setReduceItem(item);
          setShowReduceNota(true);
        }}
      >
        <Icon name="minus" s={14} />
      </button>
    )}
    
    <div className="qty-display">{item.qty}×</div>
    
    <button 
      className="btn-plus"
      onClick={() => updateItemQty(item, 1)}
    >
      <Icon name="plus" s={14} />
    </button>
    
    <div className="item-info">
      <div className="item-name">{item.name}</div>
      <div className="item-price">{COP(item.price)} c/u</div>
    </div>
    
    <div className="item-total">{COP(item.price * item.qty)}</div>
    
    {/* Solo admin tiene botón [X] */}
    {isAdmin && (
      <button 
        className="btn-remove"
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

{/* Solo empleados ven mensaje de contactar admin */}
{!isAdmin && selectedMesa.items.length > 0 && (
  <p className="employee-message">
    ¿Agregaste algo por error? Avisa al administrador.
  </p>
)}
```

---

## 9. Responsive - Mobile

```css
@media (max-width: 768px) {
  /* Header strip: stack vertical */
  .header-strip {
    flex-direction: column
    gap: 12px
    align-items: flex-start
  }
  
  /* Barra de progreso: full width */
  .progress-bars {
    max-width: 100%
  }
  
  /* Grid de mesas: 2 columnas */
  .mesa-grid {
    grid-template-columns: repeat(2, 1fr) !important
    gap: 10px
  }
  
  /* Modal POS: fullscreen, 1 columna */
  .pos-modal {
    width: 100vw
    height: 100vh
    border-radius: 0
    grid-template-columns: 1fr !important
    max-height: 100vh !important
  }
  
  /* Tabs para catálogo/consumo en mobile */
  .mobile-tabs {
    display: flex
    border-bottom: 1px solid var(--line)
    position: sticky
    top: 56px
    background: var(--panel)
    z-index: 9
  }
  
  .mobile-tab {
    flex: 1
    padding: 12px
    text-align: center
    font-weight: 700
    border-bottom: 2px solid transparent
    cursor: pointer
    
    &.active {
      border-bottom-color: var(--accent)
      color: var(--accent)
    }
  }
}
```

---

## 10. Checklist de Implementación

### Fase 1: Arquitectura y Fix de Stock
- [ ] Agregar prop `isAdmin: boolean` a `EmpMesasProps`
- [ ] Eliminar canal Realtime de `products` (líneas 94-102)
- [ ] Implementar `addToCart` con optimistic update síncrono
- [ ] Implementar `removeItem` con optimistic update (solo admin)
- [ ] Implementar `cancelarMesa` con acumulación de cambios (solo admin)
- [ ] Crear tabla `mesa_audit_log` en BD
- [ ] Implementar `reducirCantidad` con audit log

### Fase 2: Rediseño Visual - Header y Mesas
- [ ] Rediseñar header strip con 3 zonas
- [ ] Implementar barra de barras proporcional (stacked bar)
- [ ] Implementar chip "EN VIVO" pulsante
- [ ] Actualizar cronómetro con font monospace
- [ ] Rediseñar tarjetas de mesa libre
- [ ] Rediseñar tarjetas de mesa abierta
- [ ] Implementar barra de progreso en tarjetas abiertas
- [ ] Implementar chips de productos (max 3 + contador)
- [ ] Rediseñar tarjeta "Nueva mesa"

### Fase 3: Rediseño Visual - Modal POS
- [ ] Rediseñar container del modal (border-radius 22px)
- [ ] Rediseñar header del modal
- [ ] Rediseñar barra de búsqueda con ícono
- [ ] Rediseñar chips de categoría
- [ ] Rediseñar product cards
- [ ] Implementar badge de stock (colores por nivel)
- [ ] Implementar overlay "Agotado"
- [ ] Rediseñar columna de consumo
- [ ] Implementar sticky header de consumo
- [ ] Implementar botones condicionales (admin vs empleado)

### Fase 4: Rediseño Visual - Modal de Cobro
- [ ] Rediseñar container del modal
- [ ] Rediseñar card de total
- [ ] Rediseñar grid de métodos de pago
- [ ] Implementar colores por método
- [ ] Rediseñar sección de evidencia
- [ ] Rediseñar footer con botones

### Fase 5: Animaciones y Micro-Interacciones
- [ ] Implementar animación `productAdd` (200ms)
- [ ] Implementar animación `totalFlash` (300ms)
- [ ] Implementar transición mesa libre → abierta (0.3s)
- [ ] Implementar animación `pulse-live` para chip EN VIVO
- [ ] Implementar estados drag (opacity 0.5)
- [ ] Implementar drop target (border dashed)
- [ ] Implementar hover states en tarjetas
- [ ] Implementar active states en product cards

### Fase 6: Modales de Admin
- [ ] Crear componente `ModalMotivo`
- [ ] Implementar modal "Reducir cantidad"
- [ ] Implementar modal "Eliminar producto"
- [ ] Implementar modal "Cancelar mesa"
- [ ] Conectar modales con flujos de admin
- [ ] Implementar validaciones (motivo obligatorio)

### Fase 7: Responsive y Mobile
- [ ] Implementar media query para header vertical
- [ ] Implementar grid 2 columnas en mobile
- [ ] Implementar modal POS fullscreen en mobile
- [ ] Implementar tabs catálogo/consumo en mobile
- [ ] Testear gestos táctiles

### Fase 8: Testing y Pulido
- [ ] Testear flujo completo empleado
- [ ] Testear flujo completo admin
- [ ] Testear drag & drop + localStorage
- [ ] Testear optimistic updates con conexión lenta
- [ ] Testear revertir stock en cancelar mesa
- [ ] Testear audit log
- [ ] Testear responsive en múltiples dispositivos
- [ ] Testear performance con 20+ mesas abiertas
- [ ] Testear animaciones en diferentes navegadores

---

## 11. Riesgos y Mitigaciones

### Riesgo 1: Stock Desincronizado Entre Sesiones
**Problema:** Sin Realtime de `products`, si dos empleados están en el mismo producto, pueden ver stock diferente.

**Mitigación:**
- Validación en BD con `.gt('stock', 0)` previene overselling
- Toast informativo si falla: "Producto agotado"
- Recargar products manualmente (botón refresh) si se detecta desincronización
- En práctica, empleados trabajan en mesas diferentes → baja probabilidad

### Riesgo 2: Race Conditions en Optimistic Updates
**Problema:** Usuario hace click rápido múltiple en "+" antes de que persista en BD.

**Mitigación:**
- Debounce en `addToCart` (300ms)
- Deshabilitar botón temporalmente durante persistencia
- Validación de stock en cada update

### Riesgo 3: Performance con Muchas Mesas
**Problema:** Grid con 50+ mesas puede ser lento.

**Mitigación:**
- Virtualización con `react-window` si hay más de 30 mesas
- Lazy load de `mesa_items` (solo cargar al abrir modal POS)
- Memoización de componentes con `React.memo`

### Riesgo 4: Tamaño del Modal en Tablets
**Problema:** 1200px puede ser muy ancho en tablets horizontales.

**Mitigación:**
- Media query adicional para tablets (768px - 1024px)
- Reducir columna derecha a 320px en tablets
- Aumentar grid de productos a 3 columnas

---

## 12. Métricas de Éxito

**UX:**
- Reducción de tiempo para agregar 5 productos: target < 10 segundos
- Tasa de error al agregar productos: target < 2%
- NPS de empleados: target > 8/10

**Técnicas:**
- Incidentes de doble stock: target 0 por semana
- Tiempo de carga del modal POS: target < 500ms
- Performance Lighthouse: target > 90

**Negocio:**
- Reducción de quejas por stock incorrecto: target -80%
- Aumento de velocidad de atención: target +20%
- Adopción del sistema por empleados: target 100%

---

## 13. Plan de Rollout

**Fase 1: Testing Interno (1 semana)**
- Deploy a ambiente staging
- Testing con 2-3 administradores
- Recolectar feedback sobre permisos y audit log

**Fase 2: Piloto con 1 Local (1 semana)**
- Deploy a producción para 1 comercio
- Monitorear métricas de error y performance
- Hotfixes si hay bugs críticos

**Fase 3: Rollout Gradual (2 semanas)**
- 25% de comercios semana 1
- 75% de comercios semana 2
- 100% de comercios semana 3

**Fase 4: Monitoreo Post-Rollout (1 mes)**
- Análisis de métricas de éxito
- Recolección de feedback
- Iteración en base a datos

---

## 14. Referencias de Diseño

**Toast POS:**
- Grid de productos 2 columnas con imágenes grandes
- Colores vibrantes para categorías
- Total destacado en grande con animación

**Square POS:**
- Header sticky con total siempre visible
- Botones de pago grandes y táctiles
- Confirmaciones visuales claras

**Linear:**
- Chips de estado con colores semánticos
- Micro-interacciones sutiles (hover, active)
- Typography jerárquica (weights, sizes)

**Stripe Dashboard:**
- Barra de métricas en tiempo real
- Tooltips informativos
- Cards con box-shadow sutil

---

## Fin del Documento

Este diseño está listo para pasar a la fase de **escritura del plan de implementación** vía el skill `writing-plans`.
