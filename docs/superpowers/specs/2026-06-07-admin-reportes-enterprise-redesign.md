# AdminReportes Enterprise Redesign — Especificación de Diseño

**Fecha:** 2026-06-07  
**Componente:** `src/components/admin/AdminReportes.tsx`  
**Objetivo:** Rediseño completo con diseño enterprise dinámico y colorido  
**Enfoque:** Refactorización incremental (Enfoque A)

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Filtros de Fecha y Exportación](#2-filtros-de-fecha-y-exportación)
3. [KPI Cards](#3-kpi-cards)
4. [Gráfica de Ventas por Hora](#4-gráfica-de-ventas-por-hora)
5. [Balance del Período](#5-balance-del-período)
6. [Tabla de Cuadre de Inventario](#6-tabla-de-cuadre-de-inventario)
7. [Métodos de Pago](#7-métodos-de-pago)
8. [Productos Más Vendidos](#8-productos-más-vendidos)
9. [Ventas por Empleado](#9-ventas-por-empleado)
10. [Detalle de Mesas por Turno](#10-detalle-de-mesas-por-turno)
11. [Alertas de Análisis](#11-alertas-de-análisis)
12. [Exportación PDF Enterprise](#12-exportación-pdf-enterprise)

---

## 1. Arquitectura General

### Filosofía de Diseño

**Refactorización Incremental:** Mantener la estructura actual del componente pero reorganizar y mejorar cada sección con los nuevos requisitos enterprise.

**Ventajas:**
- Menor riesgo — el código actual ya funciona y tiene las queries correctas
- Aprovechar los hooks y memoización existentes
- Más rápido de implementar y probar
- Fácil de revisar cambios específicos en git diff

### Nuevas Queries y Cálculos

**Contadores para filtros:**
- Calcular contadores de registros por método de pago, categoría y empleado
- Aplicar después del filtro de fecha pero antes de los filtros específicos
- Formato: `"Efectivo (23)"`, `"Licor (45)"`, `"Juan (12)"`

**Top 3 horas para glow diferenciado:**
```tsx
const topHours = useMemo(() => {
  const sorted = [...hourlyData].sort((a, b) => b.v - a.v);
  const top3 = sorted.slice(0, 3).map(d => d.h);
  return {
    first: top3[0],
    second: top3[1],
    third: top3[2],
  };
}, [hourlyData]);

const getHourRank = (hour: number, value: number) => {
  if (value === 0) return null;
  if (hour === topHours.first) return 1;
  if (hour === topHours.second) return 2;
  if (hour === topHours.third) return 3;
  return null;
};
```

### Estado Adicional

```tsx
const [liveAnimations, setLiveAnimations] = useState(false);

useEffect(() => {
  setLiveAnimations(preset === 'hoy');
}, [preset]);
```

### Animaciones CSS

```css
@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}

@keyframes icon-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.live-dot {
  animation: pulse-live 1.4s ease-in-out infinite;
  display: inline-block;
}

.live-icon {
  animation: icon-float 2s ease-in-out infinite, icon-pulse 2s ease-in-out infinite;
}

.hourly-bar:hover {
  transform: scaleY(1.02);
  filter: brightness(1.15);
  cursor: pointer;
}

@media print {
  body > *:not(#reporte-print) { display: none !important; }
  #reporte-print { display: block !important; }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  .pdf-page {
    page-break-after: always;
    position: relative;
    min-height: 100vh;
    padding: 40px;
  }
  
  .pdf-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 400px;
    opacity: 0.08;
    pointer-events: none;
    user-select: none;
    z-index: 0;
  }
  
  .pdf-content {
    position: relative;
    z-index: 1;
  }
}

#reporte-print { display: none; }
```

---

## 2. Filtros de Fecha y Exportación

### Layout

```tsx
<div style={{ 
  display: 'flex', 
  gap: 10, 
  marginBottom: 16, 
  flexWrap: 'wrap', 
  alignItems: 'center' 
}}>
  {/* Chips de preset */}
  <div style={{ display: 'flex', gap: 6 }}>
    {PRESETS.map(p => (
      <button 
        key={p}
        className={'fchip' + (preset === p ? ' on' : '')}
        style={preset === p ? { 
          background: 'var(--accent)', 
          borderColor: 'var(--accent)', 
          color: '#0b0a12',
          fontWeight: 700,
          boxShadow: '0 2px 8px -2px var(--accent)',
        } : undefined}
        onClick={() => applyPreset(p)}
      >
        {PRESET_LABELS[p]}
      </button>
    ))}
  </div>
  
  {/* Date range picker */}
  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    <input className="inp" type="date" ... />
    <span style={{ color: 'var(--muted)' }}>→</span>
    <input className="inp" type="date" ... />
    <button className="btn sm ghost" onClick={applyCustom}>Aplicar</button>
  </div>
  
  {/* Chip "En vivo" */}
  {isLive && (
    <span style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--green)',
      padding: '4px 10px',
      background: 'color-mix(in srgb, var(--green) 12%, transparent)',
      borderRadius: 999,
      border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
    }}>
      <span className="live-dot">●</span> En vivo
    </span>
  )}
  
  {/* Botones exportación */}
  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
    <button className="btn sm ghost" onClick={doCSV}>
      <Icon name="download" s={14} /> CSV
    </button>
    <button className="btn sm ghost" onClick={doPDF}>
      <Icon name="receipt" s={14} /> PDF
    </button>
  </div>
</div>

{/* Label período */}
<div style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 12 }}>
  {rangeLabel(range)}
</div>
```

### Comportamiento

- Al cambiar preset → resetear `customFrom` y `customTo`
- Al aplicar custom range → cambiar `preset` a `'custom'`
- Chip "En vivo" solo visible cuando `preset === 'hoy'`

---

## 3. KPI Cards

### Grid Layout

```tsx
<div className="grid g4" style={{ marginBottom: 16 }}>
  {/* 4 cards */}
</div>
```

### Estructura de Card

```tsx
{[
  {
    label: 'Ventas del período',
    value: COPk(total),
    icon: 'cash',
    color: 'var(--accent)',
    sub: prevTotal > 0 ? `${trend >= 0 ? '+' : ''}${trend}% vs período anterior` : undefined,
    subColor: trend >= 0 ? 'var(--green)' : 'var(--red)',
  },
  {
    label: 'Utilidad bruta',
    value: COPk(util),
    icon: 'chart',
    color: 'var(--accent2)',
    sub: `Margen ${margen}%`,
    subColor: 'var(--muted)',
  },
  {
    label: 'Mesas / Ítems',
    value: `${sales.length} / ${itemsCount}`,
    icon: 'mesas',
    color: 'var(--accent3)',
  },
  {
    label: 'Descuadre inventario',
    value: COPk(totalRiesgo),
    icon: 'alert',
    color: totalRiesgo > 0 ? 'var(--red)' : 'var(--green)',
    sub: descuadreCount > 0 ? `${descuadreCount} producto(s)` : 'Inventario cuadra',
    subColor: descuadreCount > 0 ? 'var(--red)' : 'var(--green)',
  },
].map(({ label, value, icon, color, sub, subColor }) => (
  <div key={label} style={{
    borderLeft: `3px solid ${color}`,
    background: `linear-gradient(135deg, 
      color-mix(in srgb, ${color} 10%, var(--card)) 0%,
      color-mix(in srgb, ${color} 4%, var(--card)) 100%)`,
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: isLive ? `0 0 20px -8px ${color}` : undefined,
    position: 'relative',
  }}>
    {/* Header */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      justifyContent: 'space-between', 
      marginBottom: 8 
    }}>
      <span style={{
        fontSize: 11,
        color: 'var(--muted)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
      }}>
        {label}
      </span>
      <span 
        className={isLive ? 'live-icon' : ''}
        style={{ 
          color, 
          opacity: 0.7,
          filter: isLive ? `drop-shadow(0 0 8px ${color})` : undefined,
        }}
      >
        <Icon name={icon} s={32} />
      </span>
    </div>
    
    {/* Valor */}
    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ink)' }}>
      {value}
    </div>
    
    {/* Subtítulo */}
    {sub && (
      <div style={{ 
        fontSize: 12, 
        marginTop: 6, 
        color: subColor, 
        fontWeight: 600 
      }}>
        {sub}
      </div>
    )}
    
    {/* Chip "En vivo" dentro de la card */}
    {isLive && (
      <span style={{
        position: 'absolute',
        top: 12,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--green)',
        padding: '3px 8px',
        background: 'color-mix(in srgb, var(--green) 12%, transparent)',
        borderRadius: 999,
        border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
      }}>
        <span className="live-dot">●</span>
      </span>
    )}
  </div>
))}
```

### Detalles Visuales

**Card:**
- Borde izquierdo: 3px solid color
- Gradiente de fondo sutil (10% → 4% del color)
- Border radius: 12px
- Box shadow con glow cuando `isLive`

**Ícono:**
- Tamaño: 32px
- Opacidad: 70%
- Animación `live-icon` cuando `isLive`
- Drop shadow con glow cuando `isLive`

**Valor:**
- Font size: 28px
- Font weight: 900

**Chip "En vivo" en card:**
- Position absolute (top right)
- Font size: 10px
- Padding: 3px 8px

---

## 4. Gráfica de Ventas por Hora

### Grid Container

```tsx
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: '1.6fr 1fr', 
  gap: 16, 
  marginBottom: 16 
}}>
  {/* Gráfica hourly */}
  {/* Balance bar */}
</div>
```

### Estructura de la Gráfica

```tsx
<div className="card" style={{ padding: 20 }}>
  {/* Header */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 18 
  }}>
    <span style={{ fontSize: 15, fontWeight: 800 }}>Ventas por hora</span>
    {isLive && (
      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--green)',
      }}>
        <span className="live-dot">●</span> En vivo
      </span>
    )}
  </div>
  
  {/* Barras */}
  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 140 }}>
    {hourlyData.map(({ h, v }) => {
      const pct = Math.round(v / maxHourVal * 100);
      const rank = getHourRank(h, v);
      
      const barGradient = rank === 1
        ? 'linear-gradient(to top, var(--yellow), var(--accent))'
        : rank === 2
        ? 'linear-gradient(to top, var(--accent), var(--accent2))'
        : rank === 3
        ? 'linear-gradient(to top, var(--accent2), var(--accent3))'
        : 'linear-gradient(to top, var(--accent), var(--accent2))';
      
      const glowIntensity = rank === 1 ? '0 0 20px var(--yellow)'
        : rank === 2 ? '0 0 12px var(--accent)'
        : rank === 3 ? '0 0 6px var(--accent2)'
        : undefined;
      
      return (
        <div key={h} style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 4 
        }}>
          {/* Valor */}
          <span style={{ 
            fontSize: 10, 
            color: 'var(--muted)', 
            fontWeight: 700, 
            minHeight: 14 
          }}>
            {v > 0 ? `$${Math.round(v / 1000)}K` : ''}
          </span>
          
          {/* Contenedor barra */}
          <div style={{
            width: '100%',
            background: 'var(--border)',
            borderRadius: '6px 6px 0 0',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            overflow: 'hidden',
          }}>
            {/* Barra */}
            <div
              className="hourly-bar"
              style={{
                width: '100%',
                borderRadius: '6px 6px 0 0',
                height: `${pct}%`,
                minHeight: v > 0 ? 4 : 0,
                background: barGradient,
                boxShadow: glowIntensity,
                transition: 'height 0.5s ease, box-shadow 0.3s ease',
              }}
              title={`${HOUR_LABELS[h]}: ${COP(v)}`}
            />
          </div>
          
          {/* Label */}
          <span style={{ fontSize: 10, color: 'var(--muted2)', fontWeight: 600 }}>
            {HOUR_LABELS[h]}
          </span>
        </div>
      );
    })}
  </div>
</div>
```

### Gradientes por Ranking

- **Rank 1:** `linear-gradient(to top, var(--yellow), var(--accent))` + glow `0 0 20px var(--yellow)`
- **Rank 2:** `linear-gradient(to top, var(--accent), var(--accent2))` + glow `0 0 12px var(--accent)`
- **Rank 3:** `linear-gradient(to top, var(--accent2), var(--accent3))` + glow `0 0 6px var(--accent2)`
- **Otras:** `linear-gradient(to top, var(--accent), var(--accent2))` sin glow

### Interactividad

- Hover: `transform: scaleY(1.02)` + `filter: brightness(1.15)`
- Tooltip nativo con atributo `title`

---

## 5. Balance del Período

### Estructura

```tsx
<div className="card" style={{ padding: 20 }}>
  <span style={{ fontSize: 15, fontWeight: 800, display: 'block', marginBottom: 16 }}>
    Balance del período
  </span>
  
  {/* Barra segmentada */}
  <div style={{ marginBottom: 8 }}>
    <div style={{
      display: 'flex',
      height: 24,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3)',
    }}>
      {/* Segmento costo */}
      <div style={{
        width: `${costPct}%`,
        background: 'linear-gradient(135deg, var(--muted2), var(--muted))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 800,
        color: 'var(--bg)',
        transition: 'width 0.5s ease',
      }}>
        {costPct > 12 && <span>{costPct}%</span>}
      </div>
      
      {/* Segmento utilidad */}
      <div style={{
        width: `${100 - costPct}%`,
        background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 800,
        color: '#0b0a12',
        transition: 'width 0.5s ease',
      }}>
        {100 - costPct > 12 && <span>{100 - costPct}%</span>}
      </div>
    </div>
  </div>
  
  {/* Leyenda */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
    {[
      { label: 'Ingresos', value: total, color: 'var(--ink)', dot: 'var(--accent)' },
      { label: 'Costo de producto', value: cost, color: 'var(--muted)', dot: 'var(--muted)' },
      { label: 'Utilidad bruta', value: util, color: 'var(--green)', dot: 'var(--green)' },
    ].map(({ label, value, color, dot }) => (
      <div key={label} style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid var(--line)',
      }}>
        <span style={{
          fontSize: 13,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dot,
            boxShadow: `0 0 6px ${dot}`,
          }} />
          {label}
        </span>
        <b style={{ fontSize: 14, color, fontWeight: 800 }}>{COP(value)}</b>
      </div>
    ))}
  </div>
</div>
```

### Detalles Visuales

- Barra altura: 24px
- Porcentajes solo si segmento > 12%
- Transición suave en width
- Dots con glow en leyenda

---

## 6. Tabla de Cuadre de Inventario

### Estructura

```tsx
<div className="card" style={{ marginBottom: 16 }}>
  {/* Header */}
  <div style={{
    padding: '14px 16px',
    borderBottom: '1px solid var(--line)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <span style={{ fontSize: 15, fontWeight: 800 }}>Cuadre de inventario</span>
    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
      {sortedAudit.length} productos
    </span>
  </div>
  
  {/* Tabla */}
  <div style={{ overflowX: 'auto' }}>
    <table className="tbl">
      <thead>
        <tr>
          {[
            ['name', 'Producto'],
            ['cat', 'Categoría'],
            ['vendidas', 'Vendidas'],
            ['descontadas', 'Salidas inv.'],
            ['diferencia', 'Diferencia'],
            ['valorRiesgo', 'Valor riesgo'],
          ].map(([k, h]) => (
            <th
              key={k}
              onClick={() => toggleAuditSort(k)}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                textAlign: k === 'valorRiesgo' ? 'right' : 'left',
                fontWeight: 800,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: auditSort.k === k ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {h}{aSuf(k)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedAudit.map((r, i) => {
          const hasIssue = r.diferencia !== 0;
          const issueColor = r.diferencia > 0 ? 'var(--orange)' : 'var(--red)';
          
          return (
            <tr
              key={r.id}
              style={{
                background: hasIssue
                  ? `color-mix(in srgb, ${issueColor} 8%, ${i % 2 === 1 ? 'var(--panel2)' : 'transparent'})`
                  : i % 2 === 1 ? 'var(--panel2)' : undefined,
                transition: 'background 0.2s ease',
              }}
            >
              {/* Producto */}
              <td style={{ fontSize: 13, fontWeight: 700 }}>
                {hasIssue && (
                  <Icon name="alert" s={14} style={{
                    color: issueColor,
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }} />
                )}
                {r.name}
              </td>
              
              {/* Categoría */}
              <td>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: `${catColor(r.cat)}22`,
                  color: catColor(r.cat),
                }}>
                  {r.cat}
                </span>
              </td>
              
              {/* Vendidas */}
              <td style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                {r.vendidas}
              </td>
              
              {/* Salidas */}
              <td style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                {r.descontadas}
              </td>
              
              {/* Diferencia */}
              <td style={{ textAlign: 'center' }}>
                {r.diferencia === 0 ? (
                  <Chip color="var(--green)">Cuadra</Chip>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 800, color: issueColor }}>
                    {r.diferencia > 0 ? '+' : ''}{r.diferencia}
                  </span>
                )}
              </td>
              
              {/* Valor riesgo */}
              <td style={{ textAlign: 'right' }}>
                {r.diferencia === 0 ? (
                  <Chip color="var(--green)">Cuadra</Chip>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>
                    {COP(r.valorRiesgo)}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
  
  {/* Footer */}
  {totalRiesgo > 0 && (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--line)',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      background: 'color-mix(in srgb, var(--red) 5%, transparent)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total valor en riesgo:</span>
      <b style={{ color: 'var(--red)', fontSize: 15, fontWeight: 800 }}>{COP(totalRiesgo)}</b>
    </div>
  )}
</div>
```

### Highlighting de Descuadres

**Filas con descuadre:**
- Fondo: `color-mix(in srgb, ${issueColor} 8%, ...)`
- Ícono de alerta inline antes del nombre
- Transición suave en background

**Chip "Cuadra":**
- Fondo: `color-mix(in srgb, var(--green) 15%, transparent)`
- Borde: `1px solid color-mix(in srgb, var(--green) 30%, transparent)`
- Color: `var(--green)`

---

## 7. Métodos de Pago

### Grid 2 Columnas

```tsx
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: '1fr 1fr', 
  gap: 16, 
  marginBottom: 16 
}}>
  {/* Métodos de pago */}
  {/* Productos más vendidos */}
</div>
```

### Estructura Métodos de Pago

```tsx
<div className="card" style={{ padding: 20 }}>
  <div style={{ marginBottom: 14 }}>
    <span style={{ fontSize: 15, fontWeight: 800 }}>Métodos de pago</span>
  </div>
  
  {/* Chips con contadores */}
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
    <button
      className={'fchip' + (payFilter === 'all' ? ' on' : '')}
      onClick={() => setPayFilter('all')}
      style={payFilter === 'all' ? {
        background: 'var(--accent)',
        borderColor: 'var(--accent)',
        color: '#0b0a12',
      } : undefined}
    >
      Todos ({payData.reduce((a, p) => a + (p.v > 0 ? 1 : 0), 0)})
    </button>
    
    {PAYMENTS.map(p => {
      const count = sales.filter(s => s.payment_method === p.id).length;
      return (
        <button
          key={p.id}
          className={'fchip' + (payFilter === p.id ? ' on' : '')}
          onClick={() => setPayFilter(payFilter === p.id ? 'all' : p.id)}
          style={payFilter === p.id ? {
            background: p.color,
            borderColor: p.color,
            color: '#0b0a12',
          } : undefined}
        >
          {p.name} ({count})
        </button>
      );
    })}
  </div>
  
  {/* Barras horizontales */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {filtPay.filter(p => p.v > 0).map(p => {
      const pct = Math.round(p.v / maxPay * 100);
      return (
        <div key={p.id}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            alignItems: 'baseline',
          }}>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: p.color,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 6px ${p.color}`,
              }} />
              {p.name}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{COP(p.v)}</span>
          </div>
          
          {/* Barra */}
          <div style={{
            height: 10,
            borderRadius: 6,
            background: 'var(--border)',
            overflow: 'hidden',
          }}>
            <div
              className="payment-bar"
              style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: 6,
                background: `linear-gradient(90deg, ${p.color}, color-mix(in srgb, ${p.color} 70%, white))`,
                transition: 'width 0.5s ease',
                boxShadow: `0 0 8px -2px ${p.color}`,
              }}
              title={`${pct}% del total`}
            />
          </div>
        </div>
      );
    })}
    
    {/* Total */}
    {payTotal > 0 && (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTop: '1px solid var(--line)',
        marginTop: 4,
      }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total filtrado</span>
        <b style={{ fontSize: 14, fontWeight: 800 }}>
          {COP(filtPay.reduce((a, p) => a + p.v, 0))}
        </b>
      </div>
    )}
  </div>
</div>
```

### Detalles Visuales

- Chips con formato: `"Efectivo (23)"`
- Barras con gradiente horizontal
- Dot con glow en cada método
- Altura de barra: 10px

---

## 8. Productos Más Vendidos

### Estructura

```tsx
<div className="card" style={{ padding: 20 }}>
  <span style={{ fontSize: 15, fontWeight: 800, display: 'block', marginBottom: 14 }}>
    Productos más vendidos
  </span>
  
  {/* Chips categorías con contadores */}
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
    {topCats.map(c => {
      const count = c === 'all'
        ? topProducts.length
        : topProducts.filter(p => p.cat === c).length;
      
      return (
        <button
          key={c}
          className={'fchip' + (topCat === c ? ' on' : '')}
          onClick={() => setTopCat(c)}
          style={topCat === c ? {
            background: c === 'all' ? 'var(--accent)' : catColor(c),
            borderColor: c === 'all' ? 'var(--accent)' : catColor(c),
            color: '#0b0a12',
          } : undefined}
        >
          {c === 'all' ? 'Todas' : c} ({count})
        </button>
      );
    })}
  </div>
  
  {/* Tabla */}
  <table className="tbl">
    <thead>
      <tr>
        <th style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>
          Producto
        </th>
        <th style={{ textAlign: 'right', fontSize: 11, textTransform: 'uppercase' }}>
          Cant.
        </th>
        <th style={{ textAlign: 'right', fontSize: 11, textTransform: 'uppercase' }}>
          Venta
        </th>
      </tr>
    </thead>
    <tbody>
      {filtTopProds.slice(0, 10).map((p, i) => (
        <tr
          key={p.id}
          style={{
            background: i % 2 === 1 ? 'var(--panel2)' : undefined,
            borderLeft: i < 3 ? `3px solid ${
              i === 0 ? 'var(--yellow)' : i === 1 ? 'var(--accent)' : 'var(--accent2)'
            }` : undefined,
          }}
        >
          <td style={{
            fontSize: 13,
            fontWeight: i < 3 ? 700 : 400,
            paddingLeft: i < 3 ? 12 : undefined,
          }}>
            {i === 0 && '🥇 '}
            {i === 1 && '🥈 '}
            {i === 2 && '🥉 '}
            {i + 1}. {p.name}
          </td>
          <td style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'right' }}>
            {p.cant}
          </td>
          <td style={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>
            {COPk(p.venta)}
          </td>
        </tr>
      ))}
      
      {filtTopProds.length === 0 && (
        <tr>
          <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
            Sin ventas en esta categoría
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
```

### Ranking Visual

**Top 3:**
- Emojis de medallas: 🥇 🥈 🥉
- Borde izquierdo diferenciado por color
- Font weight 700

**Colores:**
- 1ro: `var(--yellow)`
- 2do: `var(--accent)`
- 3ro: `var(--accent2)`

---

## 9. Ventas por Empleado

### Estructura

```tsx
<div className="card" style={{ marginBottom: 16 }}>
  {/* Header */}
  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
    <span style={{ fontSize: 15, fontWeight: 800 }}>Ventas por empleado</span>
  </div>
  
  {/* Chips con contadores */}
  <div style={{
    padding: '12px 16px',
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    borderBottom: '1px solid var(--line)',
  }}>
    <button
      className={'fchip' + (empFilter === 'all' ? ' on' : '')}
      onClick={() => setEmpFilter('all')}
      style={empFilter === 'all' ? {
        background: 'var(--accent)',
        borderColor: 'var(--accent)',
        color: '#0b0a12',
      } : undefined}
    >
      Todos ({empStats.length})
    </button>
    
    {empStats.map(e => (
      <button
        key={e.id}
        className={'fchip' + (empFilter === e.id ? ' on' : '')}
        onClick={() => setEmpFilter(empFilter === e.id ? 'all' : e.id)}
        style={empFilter === e.id ? {
          background: e.color,
          borderColor: e.color,
          color: '#0b0a12',
        } : undefined}
      >
        {e.name} ({e.mesas})
      </button>
    ))}
  </div>
  
  {/* Tabla */}
  <table className="tbl">
    <thead>
      <tr>
        <th style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>
          Empleado
        </th>
        <th style={{ textAlign: 'right', fontSize: 11, textTransform: 'uppercase' }}>
          Mesas
        </th>
        <th style={{ textAlign: 'right', fontSize: 11, textTransform: 'uppercase' }}>
          Recaudado
        </th>
      </tr>
    </thead>
    <tbody>
      {filtEmpStats.map((e, i) => (
        <tr
          key={e.id}
          style={{
            background: i % 2 === 1 ? 'var(--panel2)' : undefined,
            borderLeft: i === 0 ? '3px solid var(--yellow)' : undefined,
          }}
        >
          <td style={{ paddingLeft: i === 0 ? 12 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={e.name} color={e.color} size="sm" />
              <div>
                <b style={{ fontSize: 13, display: 'block' }}>
                  {i === 0 && '⭐ '}
                  {e.name}
                </b>
                {i === 0 && (
                  <span style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 700 }}>
                    Mejor del período
                  </span>
                )}
              </div>
            </div>
          </td>
          <td style={{
            fontSize: 13,
            color: 'var(--muted)',
            textAlign: 'right',
            fontWeight: 600,
          }}>
            {e.mesas}
          </td>
          <td style={{
            fontSize: 14,
            fontWeight: 800,
            textAlign: 'right',
            color: i === 0 ? 'var(--green)' : 'var(--ink)',
          }}>
            {COP(e.recaudado)}
          </td>
        </tr>
      ))}
      
      {filtEmpStats.length === 0 && (
        <tr>
          <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
            Sin datos de empleados en este período
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
```

### Top Empleado

- Borde izquierdo amarillo (3px)
- Emoji estrella ⭐
- Label "Mejor del período" en amarillo
- Recaudado en verde

---

## 10. Detalle de Mesas por Turno

### Estructura

```tsx
{shiftRows.length > 0 && (
  <div className="card" style={{ marginBottom: 16 }}>
    {/* Header */}
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid var(--line)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 15, fontWeight: 800 }}>Detalle de mesas por turno</span>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        {shiftRows.length} turnos
      </span>
    </div>
    
    {/* Tabla */}
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase', width: '60%' }}>
            Turno
          </th>
          <th style={{ textAlign: 'center', fontSize: 11, textTransform: 'uppercase' }}>
            Mesas
          </th>
          <th style={{ textAlign: 'right', fontSize: 11, textTransform: 'uppercase' }}>
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {shiftRows.map((s, i) => (
          <tr
            key={s.id}
            style={{
              background: i % 2 === 1 ? 'var(--panel2)' : undefined,
              borderLeft: i === 0 ? '3px solid var(--accent)' : undefined,
            }}
          >
            <td style={{
              fontSize: 13,
              maxWidth: 400,
              paddingLeft: i === 0 ? 12 : undefined,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i === 0 && <span style={{ fontSize: 16 }}>🏆</span>}
                <span style={{ fontWeight: i === 0 ? 700 : 400 }}>
                  {s.label}
                </span>
              </div>
            </td>
            <td style={{
              fontSize: 13,
              color: 'var(--muted)',
              textAlign: 'center',
              fontWeight: 600,
            }}>
              {s.mesas}
            </td>
            <td style={{
              fontSize: 14,
              fontWeight: 800,
              textAlign: 'right',
              color: i === 0 ? 'var(--accent)' : 'var(--ink)',
            }}>
              {COP(s.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

### Top Turno

- Borde izquierdo accent (3px)
- Emoji trofeo 🏆
- Font weight 700
- Total en color accent

---

## 11. Alertas de Análisis

### Estructura del Banner

```tsx
{totalRiesgo > 100000 && (
  <div style={{
    display: 'flex',
    gap: 14,
    padding: '14px 18px',
    borderRadius: 12,
    marginBottom: 16,
    background: 'linear-gradient(135deg, color-mix(in srgb, var(--red) 12%, transparent), color-mix(in srgb, var(--red) 8%, transparent))',
    border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
    borderLeft: '4px solid var(--red)',
    boxShadow: '0 4px 12px -4px color-mix(in srgb, var(--red) 40%, transparent)',
  }}>
    {/* Ícono */}
    <span style={{
      color: 'var(--red)',
      flexShrink: 0,
      marginTop: 2,
      filter: 'drop-shadow(0 0 6px var(--red))',
    }}>
      <Icon name="alert" s={22} />
    </span>
    
    {/* Contenido */}
    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
      <b style={{
        color: 'var(--red)',
        fontSize: 14,
        display: 'block',
        marginBottom: 4,
        fontWeight: 800,
      }}>
        ⚠️ El inventario no cuadra en {descuadreCount} producto{descuadreCount > 1 ? 's' : ''}
      </b>
      
      <span style={{ color: 'var(--muted)' }}>
        Salieron más unidades de las vendidas — posible merma, consumo interno o venta sin registrar.
      </span>
      
      <div style={{ marginTop: 6 }}>
        <b style={{ color: 'var(--ink)' }}>Valor en riesgo: </b>
        <span style={{
          color: 'var(--red)',
          fontSize: 15,
          fontWeight: 800,
          textShadow: '0 0 10px color-mix(in srgb, var(--red) 30%, transparent)',
        }}>
          {COP(totalRiesgo)}
        </span>
      </div>
    </div>
  </div>
)}
```

### Condición de Activación

- Solo mostrar si `totalRiesgo > 100000` (más de $100.000 COP)

---

## 12. Exportación PDF Enterprise

### A) Función `doPDF()` Mejorada

```tsx
function doPDF() {
  const pid = 'reporte-print';
  document.getElementById(pid)?.remove();
  
  // Generar SVG de Maylo para marca de agua
  const mayloSVG = typeof window !== 'undefined' && (window as any).maylo
    ? (window as any).maylo({ eyes: 'open', mouth: 'smile', arms: 'neutral', panel: false })
    : '';
  
  // Convertir SVG a base64
  const mayloBase64 = mayloSVG
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(mayloSVG)))}`
    : '';
  
  // Preparar datos para el PDF...
  const date = new Date().toLocaleDateString('es-CO', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Generar HTML del PDF...
  const div = document.createElement('div');
  div.id = pid;
  div.innerHTML = `...`; // Ver estructura completa abajo
  
  document.body.appendChild(div);
  window.print();
  setTimeout(() => div.remove(), 1500);
}
```

### B) Estructura HTML del PDF

#### Portada

```html
<!-- PORTADA -->
<div class="pdf-page">
  ${mayloBase64 ? `
    <div class="pdf-watermark">
      <img src="${mayloBase64}" style="width: 100%; height: 100%; object-fit: contain;" />
    </div>
  ` : ''}
  
  <div class="pdf-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;text-align:center">
    <!-- Logo -->
    <div style="font-size:62px;font-weight:900;letter-spacing:-.03em;margin-bottom:8px">
      FloorUX<span style="color:#7F77DD">.</span>
    </div>
    
    <!-- Subtítulo -->
    <div style="font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.2em;margin-bottom:32px">
      OperUX · CRM Nightlife
    </div>
    
    <!-- Separador -->
    <div style="width:80px;height:4px;background:#7F77DD;border-radius:2px;margin:24px auto"></div>
    
    <!-- Comercio -->
    <div style="font-size:32px;font-weight:800;margin:20px 0 12px;color:#111">
      ${comercioName}
    </div>
    
    <!-- Período -->
    <div style="font-size:18px;color:#555;margin-bottom:8px">
      Reporte de ventas · ${rangeLabel(range)}
    </div>
    
    <!-- Fecha -->
    <div style="font-size:14px;color:#999;margin-bottom:40px">
      Generado el ${date}
    </div>
    
    <!-- Badge confidencial -->
    <div style="margin-top:32px;font-size:12px;color:#bbb;text-transform:uppercase;letter-spacing:.12em;border:1.5px solid #ddd;padding:8px 24px;border-radius:999px">
      Confidencial — Uso interno
    </div>
  </div>
</div>
```

#### Sección 1: Resumen Ejecutivo

```html
<div class="pdf-page">
  ${mayloBase64 ? `
    <div class="pdf-watermark">
      <img src="${mayloBase64}" style="width:100%;height:100%;object-fit:contain;" />
    </div>
  ` : ''}
  
  <div class="pdf-content">
    <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">
      Sección 1 — Resumen ejecutivo
    </h2>
    
    <!-- KPIs Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      ${[
        ['Ventas del período', COP(total), '#7F77DD'],
        ['Utilidad bruta', COP(util), '#27C3D8'],
        ['Mesas cerradas', String(sales.length), '#B57BE0'],
        ['Ítems vendidos', String(itemsCount), '#F5C400']
      ].map(([l, v, c]) => `
        <div style="border-left:3px solid ${c};padding:12px 16px;background:#fafafa;border-radius:0 8px 8px 0">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em">${l}</div>
          <div style="font-size:22px;font-weight:900;color:#111;margin-top:4px">${v}</div>
        </div>
      `).join('')}
    </div>
    
    <!-- Balance bar -->
    <div style="margin-bottom:6px;font-size:10px;color:#888">Balance del período</div>
    <div style="display:flex;height:20px;border-radius:6px;overflow:hidden">
      <div style="width:${costPct}%;background:#d1d5db;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#555">
        ${costPct}%
      </div>
      <div style="width:${100-costPct}%;background:#7F77DD;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">
        ${100-costPct}%
      </div>
    </div>
    
    <!-- Leyenda -->
    <div style="display:flex;gap:24px;margin-top:10px;font-size:11px;color:#666">
      <span>● Ingresos: ${COP(total)}</span>
      <span>● Costo: ${COP(cost)}</span>
      <span style="color:#16a34a;font-weight:700">● Utilidad: ${COP(util)}</span>
    </div>
  </div>
</div>
```

#### Sección 2: Análisis de Ventas

```html
<div class="pdf-page">
  ${mayloBase64 ? `
    <div class="pdf-watermark">
      <img src="${mayloBase64}" style="width:100%;height:100%;object-fit:contain;" />
    </div>
  ` : ''}
  
  <div class="pdf-content">
    <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">
      Sección 2 — Análisis de ventas
    </h2>
    
    <!-- Gráfica ventas por hora -->
    <div style="margin-bottom:4px;font-size:12px;font-weight:700">Ventas por hora</div>
    <div style="display:flex;gap:8px;align-items:flex-end;height:120px;margin-bottom:24px">
      ${hourlyData.map(d => {
        const h = d.h;
        const pct = Math.round(d.v / maxHourVal * 100);
        const rank = getHourRank(h, d.v);
        const barColor = rank === 1 ? '#F5C400' : rank === 2 ? '#7F77DD' : rank === 3 ? '#27C3D8' : '#7F77DD';
        
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
            <span style="font-size:9px;color:#666">${d.v > 0 ? '$'+Math.round(d.v/1000)+'K' : ''}</span>
            <div style="width:100%;background:#eee;border-radius:4px;overflow:hidden;height:80px;display:flex;align-items:flex-end">
              <div style="width:100%;background:${barColor};height:${pct}%;border-radius:4px 4px 0 0;min-height:2px"></div>
            </div>
            <span style="font-size:9px;color:#999">${HOUR_LABELS[h]??''}</span>
          </div>
        `;
      }).join('')}
    </div>
    
    <!-- Tabla empleados -->
    ${empStats.length ? `
      <div style="margin-bottom:4px;font-size:12px;font-weight:700">Ventas por empleado</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:2px solid #111">
            <th style="text-align:left;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Empleado</th>
            <th style="text-align:right;padding:5px 8px;font-size:10px;text-transform:uppercase">Mesas</th>
            <th style="text-align:right;padding:5px 8px;font-size:10px;text-transform:uppercase">Recaudado</th>
          </tr>
        </thead>
        <tbody>
          ${empStats.map(e => `
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:5px 8px">${e.name}</td>
              <td style="padding:5px 8px;text-align:right">${e.mesas}</td>
              <td style="padding:5px 8px;text-align:right;font-weight:700">${COP(e.recaudado)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    <!-- Tabla turnos (solo si < 20) -->
    ${shiftRows.length > 0 && shiftRows.length < 20 ? `
      <div style="margin-top:32px">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">Detalle de turnos</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="border-bottom:2px solid #111">
              <th style="text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase">Turno</th>
              <th style="text-align:right;padding:5px 8px;font-size:9px;text-transform:uppercase">Mesas</th>
              <th style="text-align:right;padding:5px 8px;font-size:9px;text-transform:uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            ${shiftRows.map(s => `
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:5px 8px">${s.label}</td>
                <td style="padding:5px 8px;text-align:right">${s.mesas}</td>
                <td style="padding:5px 8px;text-align:right;font-weight:700">${COP(s.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  </div>
</div>
```

#### Sección 3: Inventario

```html
<div class="pdf-page">
  ${mayloBase64 ? `
    <div class="pdf-watermark">
      <img src="${mayloBase64}" style="width:100%;height:100%;object-fit:contain;" />
    </div>
  ` : ''}
  
  <div class="pdf-content">
    <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">
      Sección 3 — Cuadre de inventario
    </h2>
    
    ${auditRows.filter(r => r.diferencia !== 0).length > 0 ? `
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="border-bottom:2px solid #111">
            ${['Producto','Cat.','Vendidas','Salidas','Dif.','Valor riesgo'].map(h => `
              <th style="text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.06em">${h}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${auditRows.filter(r => r.diferencia !== 0).map(r => `
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:5px 8px">${r.name}</td>
              <td style="padding:5px 8px">${r.cat}</td>
              <td style="padding:5px 8px;text-align:right">${r.vendidas}</td>
              <td style="padding:5px 8px;text-align:right">${r.descontadas}</td>
              <td style="padding:5px 8px;text-align:right;color:${r.diferencia>0?'#f97316':'#ef4444'}">
                ${r.diferencia>0?'+':''}${r.diferencia}
              </td>
              <td style="padding:5px 8px;text-align:right;color:#ef4444;font-weight:700">
                $${Math.round(r.valorRiesgo/1000)}K
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top:12px;font-size:12px;font-weight:700;color:#ef4444">
        Total valor en riesgo: ${COP(totalRiesgo)}
      </div>
    ` : `
      <p style="color:#888;font-size:13px">Inventario cuadra correctamente en el período.</p>
    `}
  </div>
</div>
```

#### Sección 4: Métodos de Pago + Top Productos

```html
<div class="pdf-page">
  ${mayloBase64 ? `
    <div class="pdf-watermark">
      <img src="${mayloBase64}" style="width:100%;height:100%;object-fit:contain;" />
    </div>
  ` : ''}
  
  <div class="pdf-content">
    <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:20px">
      Sección 4 — Métodos de pago · Top productos
    </h2>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
      <!-- Métodos de pago -->
      <div>
        <div style="font-size:12px;font-weight:700;margin-bottom:12px">Distribución por método</div>
        ${payData.filter(p=>p.v>0).map(p => `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
              <span>${p.name}</span>
              <span style="font-weight:700">${COP(p.v)}</span>
            </div>
            <div style="height:8px;background:#eee;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.round(p.v/payTotal*100)}%;background:#7F77DD;border-radius:4px"></div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Top productos -->
      <div>
        <div style="font-size:12px;font-weight:700;margin-bottom:12px">Top 10 productos</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="border-bottom:1px solid #ddd">
              <th style="text-align:left;padding:4px 6px;font-size:9px;text-transform:uppercase">Producto</th>
              <th style="text-align:right;padding:4px 6px;font-size:9px;text-transform:uppercase">Cant.</th>
              <th style="text-align:right;padding:4px 6px;font-size:9px;text-transform:uppercase">Venta</th>
            </tr>
          </thead>
          <tbody>
            ${topProducts.slice(0, 10).map((p, i) => `
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:5px 8px">${i+1}. ${p.name}</td>
                <td style="padding:5px 8px;text-align:center">${p.cant}</td>
                <td style="padding:5px 8px;text-align:right;font-weight:700">$${Math.round(p.venta/1000)}K</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="margin-top:40px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #ddd;padding-top:12px">
      FloorUX CRM · OperUX by mrzlabs · © 2026 Todos los derechos reservados
    </div>
  </div>
</div>
```

### C) Marca de Agua Maylo

**Características:**
- Posición: centrada en cada página
- Sin rotación (0deg)
- Tamaño: 400px × 400px
- Opacidad: 8% (0.08)
- Z-index: 0 (detrás del contenido)
- Object-fit: contain

**Implementación:**
```html
<div class="pdf-watermark">
  <img src="${mayloBase64}" style="width: 100%; height: 100%; object-fit: contain;" />
</div>
```

### D) Condicional de Turnos en PDF

- Solo incluir sección de turnos si `shiftRows.length < 20`
- Si hay 20 o más turnos, omitir para evitar PDFs muy largos
- Incluir en Sección 2 junto con empleados

---

## Resumen de Cambios Principales

### Queries y Cálculos
- ✅ Contadores para filtros (formato: `"Efectivo (23)"`)
- ✅ Top 3 horas con ranking para glow diferenciado
- ✅ Estado `liveAnimations` basado en `preset === 'hoy'`

### Animaciones CSS
- ✅ `pulse-live` para chip "En vivo"
- ✅ `icon-float` + `icon-pulse` para íconos en KPIs
- ✅ Hover en barras horarias
- ✅ Estilos de impresión con marca de agua

### Componentes Visuales
- ✅ Filtros con chips dinámicos + chip "En vivo"
- ✅ 4 KPI Cards con gradientes, bordes coloreados y animaciones
- ✅ Gráfica horaria con top 3 y gradientes diferenciados
- ✅ Balance con barra segmentada y leyenda detallada
- ✅ Tabla inventario con highlighting de descuadres
- ✅ Métodos de pago con barras gradientes y contadores
- ✅ Top productos con ranking visual y emojis
- ✅ Empleados con ranking y avatar
- ✅ Turnos con emoji trofeo para el top
- ✅ Banner de alerta con gradiente y glow
- ✅ PDF enterprise con marca de agua Maylo

### Exportación
- ✅ PDF con portada profesional
- ✅ Marca de agua Maylo centrada (8% opacidad, 400px)
- ✅ Secciones organizadas con headers
- ✅ Condicional de turnos (solo si < 20)
- ✅ Footer en cada página

---

## Próximos Pasos

1. ✅ **Diseño aprobado** — todas las secciones validadas
2. **Spec review** — verificar placeholders y consistencia
3. **User review** — aprobar spec antes de implementación
4. **Implementation plan** — crear plan detallado de implementación

---

**Fecha de última actualización:** 2026-06-07  
**Estado:** Diseño completo — pendiente de spec review
