# AdminReportes Enterprise Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar completamente AdminReportes.tsx con diseño enterprise dinámico y colorido según especificación 2026-06-07-admin-reportes-enterprise-redesign.md

**Architecture:** Refactorización incremental del componente existente — mantener estructura, queries y hooks actuales, mejorar cada sección visual con nuevos requisitos enterprise (KPIs animados, gráficas con gradientes, PDF con marca de agua Maylo)

**Tech Stack:** React 18, TypeScript, Supabase, CSS-in-JS inline styles, window.print() API

---

## File Structure

**Files to modify:**
- `src/components/admin/AdminReportes.tsx` — componente principal (líneas 1-697)

**No new files needed** — enfoque incremental sobre archivo existente

---

## Task 1: Add CSS Animations and State Management

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:1-75`

- [ ] **Step 1: Add liveAnimations state after existing useState hooks**

Locate line 81 (`const supabase = createClient();`) and add before it:

```tsx
const [liveAnimations, setLiveAnimations] = useState(false);
```

- [ ] **Step 2: Add useEffect for liveAnimations after load useEffect**

After line 84 (`useEffect(() => { load(); }, [comercioId, range]);`), add:

```tsx
useEffect(() => {
  setLiveAnimations(preset === 'hoy');
}, [preset]);
```

- [ ] **Step 3: Add isLive constant after rangeLabel helpers**

After line 354 (`const isLive = preset === 'hoy';`), verify it exists. If not, add:

```tsx
const isLive = preset === 'hoy';
```

- [ ] **Step 4: Add CSS animations in style block**

Replace the existing `<style dangerouslySetInnerHTML={{ __html: \`...\` }} />` block (lines 363-371) with:

```tsx
<style dangerouslySetInnerHTML={{ __html: `
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
`}} />
```

- [ ] **Step 5: Verify changes compile**

Run: `npm run dev`  
Expected: No TypeScript errors, dev server starts successfully

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): add CSS animations and liveAnimations state

- Add pulse-live, icon-float, icon-pulse keyframes
- Add liveAnimations state synced with preset === 'hoy'
- Add print media styles for PDF generation
- Add hover effects for hourly bars"
```

---

## Task 2: Add Top 3 Hours Calculation

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:136-139`

- [ ] **Step 1: Add topHours useMemo after hourlyData**

After line 136 (end of `hourlyData` useMemo), add:

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
```

- [ ] **Step 2: Add getHourRank helper function after topHours**

```tsx
const getHourRank = (hour: number, value: number) => {
  if (value === 0) return null;
  if (hour === topHours.first) return 1;
  if (hour === topHours.second) return 2;
  if (hour === topHours.third) return 3;
  return null;
};
```

- [ ] **Step 3: Remove old peakHour calculation**

Delete line 138 (`const peakHour = hourlyData.reduce...`)

- [ ] **Step 4: Verify changes compile**

Run: `npm run dev`  
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): add top 3 hours ranking calculation

- Replace single peakHour with top 3 ranking system
- Add getHourRank helper for gradient differentiation"
```

---

## Task 3: Redesign Filter Chips and Export Buttons

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:374-406`

- [ ] **Step 1: Update preset chips styling**

Replace lines 378-385 with:

```tsx
{PRESETS.map(p => (
  <button 
    key={p} 
    type="button"
    className={'fchip' + (preset === p ? ' on' : '')}
    style={preset === p ? { 
      background: 'var(--accent)', 
      borderColor: 'var(--accent)', 
      color: '#0b0a12',
      fontWeight: 700,
      boxShadow: '0 2px 8px -2px var(--accent)',
    } : undefined}
    onClick={() => applyPreset(p)}>
    {PRESET_LABELS[p]}
  </button>
))}
```

- [ ] **Step 2: Update "En vivo" chip styling**

Replace lines 395-399 with:

```tsx
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
```

- [ ] **Step 3: Verify visual changes in browser**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Chips have enhanced styling, "En vivo" chip animates when "Hoy" is selected

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): enhance filter chips styling

- Add box-shadow to active preset chips
- Improve En vivo chip with color-mix backgrounds
- Add live-dot animation class"
```

---

## Task 4: Redesign KPI Cards with Gradients and Animations

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:408-432`

- [ ] **Step 1: Replace KPI cards grid section**

Replace lines 409-432 with:

```tsx
<div className="grid g4" style={{ marginBottom: 16 }}>
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
      
      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ink)' }}>
        {value}
      </div>
      
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
</div>
```

- [ ] **Step 2: Verify KPI cards render correctly**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: 4 KPI cards with gradients, animated icons when "Hoy" selected, glow effects

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): redesign KPI cards with enterprise styling

- Add gradient backgrounds with color-mix
- Add 3px left border in card color
- Add live-icon animation for icons when preset is Hoy
- Add small En vivo chip in top-right corner when live
- Add box-shadow glow when live"
```

---

## Task 5: Redesign Hourly Chart with Top 3 Gradients

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:435-471`

- [ ] **Step 1: Update hourly chart header**

Replace lines 438-445 with:

```tsx
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
```

- [ ] **Step 2: Update hourly bars with ranking gradients**

Replace lines 446-470 with:

```tsx
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
        <span style={{ 
          fontSize: 10, 
          color: 'var(--muted)', 
          fontWeight: 700, 
          minHeight: 14 
        }}>
          {v > 0 ? `$${Math.round(v / 1000)}K` : ''}
        </span>
        
        <div style={{
          width: '100%',
          background: 'var(--border)',
          borderRadius: '6px 6px 0 0',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
        }}>
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
        
        <span style={{ fontSize: 10, color: 'var(--muted2)', fontWeight: 600 }}>
          {HOUR_LABELS[h]}
        </span>
      </div>
    );
  })}
</div>
```

- [ ] **Step 3: Verify hourly chart rendering**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Bars with gradients, top 3 have different colors and glow, hover effects work

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): add top 3 ranking to hourly chart

- Top 1: yellow to accent gradient + 20px glow
- Top 2: accent to accent2 gradient + 12px glow  
- Top 3: accent2 to accent3 gradient + 6px glow
- Add En vivo chip in chart header when live
- Add hover effects (scale + brightness)"
```

---

## Task 6: Redesign Balance Bar with Gradients

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:473-496`

- [ ] **Step 1: Update balance bar title**

Replace line 475 with:

```tsx
<span style={{ fontSize: 15, fontWeight: 800, display: 'block', marginBottom: 16 }}>
  Balance del período
</span>
```

- [ ] **Step 2: Update segmented bar**

Replace lines 476-483 with:

```tsx
<div style={{ marginBottom: 8 }}>
  <div style={{
    display: 'flex',
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3)',
  }}>
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
```

- [ ] **Step 3: Update legend with dots and glow**

Replace lines 484-494 with:

```tsx
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
```

- [ ] **Step 4: Verify balance bar rendering**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Segmented bar with gradients, percentages only show if > 12%, legend with glowing dots

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): redesign balance bar with gradients

- Add gradient backgrounds to segments
- Increase height to 24px for better visibility
- Add box-shadow to bar
- Add glowing dots to legend items
- Show percentages only if segment > 12%"
```

---

## Task 7: Add Highlighting to Inventory Audit Table

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:499-549`

- [ ] **Step 1: Update table header styling**

Replace lines 509-513 with:

```tsx
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
    className="sortable"
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
```

- [ ] **Step 2: Update tbody with highlighting logic**

Replace lines 517-539 with:

```tsx
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
      
      <td style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        {r.vendidas}
      </td>
      
      <td style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        {r.descontadas}
      </td>
      
      <td style={{ textAlign: 'center' }}>
        {r.diferencia === 0 ? (
          <Chip color="var(--green)">Cuadra</Chip>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 800, color: issueColor }}>
            {r.diferencia > 0 ? '+' : ''}{r.diferencia}
          </span>
        )}
      </td>
      
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
```

- [ ] **Step 3: Verify table highlighting**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Rows with issues have colored backgrounds, alert icons, active sort column highlighted

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): add highlighting to inventory audit

- Add 8% color-mix background to rows with discrepancies
- Add alert icon inline for problem rows
- Highlight active sort column header in accent color
- Improve table header styling (uppercase, letter-spacing)"
```

---

## Task 8: Add Counters to Payment Method Chips

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:552-586`

- [ ] **Step 1: Update payment chips with counters**

Replace lines 558-567 with:

```tsx
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
```

- [ ] **Step 2: Update payment bars with gradients and dots**

Replace lines 568-579 with:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
  {filtPay.filter(p => p.v > 0).map(p => {
    const pct = Math.round(p.v / maxPay * 100);
    return (
      <div key={p.id}>
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
```

- [ ] **Step 3: Verify payment methods section**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Chips show counters, bars have gradients and glowing dots, hover shows percentage

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): enhance payment methods section

- Add counters to filter chips: Efectivo (23)
- Add glowing dots before method names
- Add horizontal gradients to bars
- Add box-shadow glow to bars"
```

---

## Task 9: Add Ranking to Top Products Table

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:589-616`

- [ ] **Step 1: Update top products chips with counters**

Replace lines 592-600 with:

```tsx
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
```

- [ ] **Step 2: Update table rows with medals and borders**

Replace lines 604-610 with:

```tsx
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
```

- [ ] **Step 3: Verify top products table**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Chips show counters, top 3 have medals and colored borders

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): add ranking to top products

- Add counters to category chips
- Add medal emojis to top 3: 🥇🥈🥉
- Add colored left borders to top 3
- Increase font weight for top 3"
```

---

## Task 10: Add Ranking to Employee Stats

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:619-654`

- [ ] **Step 1: Update employee chips with counters**

Replace lines 624-632 with:

```tsx
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
```

- [ ] **Step 2: Update employee table rows with star for top**

Replace lines 637-647 with:

```tsx
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
```

- [ ] **Step 3: Verify employee stats section**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Chips show mesa counts, top employee has star emoji and yellow label

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): add ranking to employee stats

- Add mesa counters to employee chips
- Add star emoji and Mejor del período label for top
- Add yellow left border for top employee
- Highlight top employee recaudado in green"
```

---

## Task 11: Add Trophy to Top Shift

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:657-675`

- [ ] **Step 1: Update shift table rows with trophy**

Replace lines 665-670 with:

```tsx
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
```

- [ ] **Step 2: Verify shift details table**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: Top shift has trophy emoji, accent border, and highlighted total

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): add trophy to top shift

- Add trophy emoji 🏆 for first shift
- Add accent left border for top shift
- Highlight top shift total in accent color
- Increase font weight for top shift label"
```

---

## Task 12: Enhance Alert Banner

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:678-692`

- [ ] **Step 1: Replace alert banner with enterprise design**

Replace lines 678-692 with:

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
    <span style={{
      color: 'var(--red)',
      flexShrink: 0,
      marginTop: 2,
      filter: 'drop-shadow(0 0 6px var(--red))',
    }}>
      <Icon name="alert" s={22} />
    </span>
    
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

- [ ] **Step 2: Verify alert banner (need test data with totalRiesgo > 100000)**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Expected: If inventory has >$100K risk, banner shows with gradient background and glow

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): enhance alert banner design

- Add gradient red background
- Add 4px red left border
- Add box-shadow with red glow
- Add drop-shadow filter to icon
- Add text-shadow to valor en riesgo amount"
```

---

## Task 13: Implement Enterprise PDF Export with Maylo Watermark

**Files:**
- Modify: `src/components/admin/AdminReportes.tsx:222-343`

- [ ] **Step 1: Update doPDF function with Maylo SVG capture**

Replace lines 242-244 (right after `const pid = 'reporte-print';` and `document.getElementById(pid)?.remove();`) with:

```tsx
// Generar SVG de Maylo para marca de agua
const mayloSVG = typeof window !== 'undefined' && (window as any).maylo
  ? (window as any).maylo({ eyes: 'open', mouth: 'smile', arms: 'neutral', panel: false })
  : '';

// Convertir SVG a base64
const mayloBase64 = mayloSVG
  ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(mayloSVG)))}`
  : '';
```

- [ ] **Step 2: Add date formatting for PDF**

After the mayloBase64 code, add:

```tsx
const date = new Date().toLocaleDateString('es-CO', { 
  day: '2-digit', 
  month: 'long', 
  year: 'numeric' 
});
```

- [ ] **Step 3: Replace PDF HTML structure with enterprise design**

Replace the entire `div.innerHTML = \`...\`;` block (lines ~270-339) with the PDF structure from spec section 12. The complete HTML should include:

1. Portada with Maylo watermark
2. Sección 1: Resumen ejecutivo (KPIs + Balance)
3. Sección 2: Análisis de ventas (Hourly chart + Employees + Shifts if < 20)
4. Sección 3: Inventario (Audit table or "cuadra" message)
5. Sección 4: Métodos de pago + Top productos

Each section should have:
```html
${mayloBase64 ? `
  <div class="pdf-watermark">
    <img src="${mayloBase64}" style="width: 100%; height: 100%; object-fit: contain;" />
  </div>
` : ''}
```

Full HTML structure:

```tsx
div.innerHTML = `
<div style="font-family:system-ui,sans-serif;color:#111;padding:0;position:relative">

<!-- PORTADA -->
<div class="pdf-page">
  ${mayloBase64 ? `
    <div class="pdf-watermark">
      <img src="${mayloBase64}" style="width: 100%; height: 100%; object-fit: contain;" />
    </div>
  ` : ''}
  
  <div class="pdf-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;text-align:center">
    <div style="font-size:62px;font-weight:900;letter-spacing:-.03em;margin-bottom:8px">
      FloorUX<span style="color:#7F77DD">.</span>
    </div>
    <div style="font-size:14px;color:#888;text-transform:uppercase;letter-spacing:.2em;margin-bottom:32px">
      OperUX · CRM Nightlife
    </div>
    <div style="width:80px;height:4px;background:#7F77DD;border-radius:2px;margin:24px auto"></div>
    <div style="font-size:32px;font-weight:800;margin:20px 0 12px;color:#111">
      ${comercioName}
    </div>
    <div style="font-size:18px;color:#555;margin-bottom:8px">
      Reporte de ventas · ${rangeLabel(range)}
    </div>
    <div style="font-size:14px;color:#999;margin-bottom:40px">
      Generado el ${date}
    </div>
    <div style="margin-top:32px;font-size:12px;color:#bbb;text-transform:uppercase;letter-spacing:.12em;border:1.5px solid #ddd;padding:8px 24px;border-radius:999px">
      Confidencial — Uso interno
    </div>
  </div>
</div>

<!-- S1: RESUMEN EJECUTIVO -->
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
    
    <div style="margin-bottom:6px;font-size:10px;color:#888">Balance del período</div>
    <div style="display:flex;height:20px;border-radius:6px;overflow:hidden">
      <div style="width:${costPct}%;background:#d1d5db;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#555">
        ${costPct}%
      </div>
      <div style="width:${100-costPct}%;background:#7F77DD;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">
        ${100-costPct}%
      </div>
    </div>
    
    <div style="display:flex;gap:24px;margin-top:10px;font-size:11px;color:#666">
      <span>● Ingresos: ${COP(total)}</span>
      <span>● Costo: ${COP(cost)}</span>
      <span style="color:#16a34a;font-weight:700">● Utilidad: ${COP(util)}</span>
    </div>
  </div>
</div>

<!-- S2: ANÁLISIS DE VENTAS -->
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

<!-- S3: INVENTARIO -->
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

<!-- S4: MÉTODOS DE PAGO + TOP PRODUCTOS -->
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
    
    <div style="margin-top:40px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #ddd;padding-top:12px">
      FloorUX CRM · OperUX by mrzlabs · © 2026 Todos los derechos reservados
    </div>
  </div>
</div>

</div>`;
```

- [ ] **Step 4: Test PDF generation**

Run: `npm run dev`, navigate to `/admin` → Reportes, click PDF button  
Expected: Print dialog opens with 5-page PDF: portada + 4 sections, each with Maylo watermark

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminReportes.tsx
git commit -m "feat(AdminReportes): implement enterprise PDF with Maylo watermark

- Add Maylo SVG capture and base64 conversion
- Add professional portada with FloorUX branding
- Add 4 content sections with watermarks
- Add conditional shifts section (only if < 20)
- Add footer with copyright on each page
- Improve print CSS for color preservation"
```

---

## Task 14: Final Integration Testing

**Files:**
- Modify: None (testing only)

- [ ] **Step 1: Test all filter states**

Run: `npm run dev`, navigate to `/admin` → Reportes  
Test sequence:
1. Click "Hoy" → verify "En vivo" chips appear in filters, KPIs, and hourly chart
2. Click "Ayer" → verify "En vivo" chips disappear
3. Click "7 días" → verify data updates
4. Test custom date range → verify it works
5. Click back to "Hoy" → verify animations return

Expected: All filters work, animations sync correctly with preset

- [ ] **Step 2: Test KPI cards**

With "Hoy" selected:
1. Verify 4 cards render with gradients
2. Verify icons animate (float + pulse)
3. Verify icons have glow effect
4. Verify small "En vivo" chip appears in top-right

Expected: All visual enhancements present

- [ ] **Step 3: Test hourly chart**

1. Verify bars have gradients (top 3 different colors)
2. Verify top bar has yellow gradient and strongest glow
3. Hover over bars → verify scale and brightness effects
4. Verify tooltip shows on hover

Expected: Top 3 ranking system works correctly

- [ ] **Step 4: Test inventory audit highlighting**

1. Find a product with diferencia !== 0
2. Verify row has colored background (8% opacity)
3. Verify alert icon appears before product name
4. Verify footer shows total valor en riesgo

Expected: Problem rows clearly highlighted

- [ ] **Step 5: Test filter chips with counters**

1. Check payment method chips → verify format "Efectivo (X)"
2. Check category chips in top products → verify format "Licor (X)"
3. Check employee chips → verify format "Juan (X)"

Expected: All chips show counters correctly

- [ ] **Step 6: Test ranking visuals**

1. Top products → verify top 3 have medals (🥇🥈🥉) and colored borders
2. Employee stats → verify top has star (⭐) and "Mejor del período" label
3. Shift details → verify top has trophy (🏆) and accent border

Expected: All rankings visually clear

- [ ] **Step 7: Test PDF generation**

1. Click PDF button
2. Verify print dialog opens
3. Check preview:
   - Portada with Maylo watermark (centered, 8% opacity)
   - Sección 1: KPIs + Balance
   - Sección 2: Hourly chart + Employees (+ Shifts if < 20)
   - Sección 3: Inventory audit table
   - Sección 4: Payments + Top products
4. Verify each page has Maylo watermark
5. Verify footer on last page

Expected: Professional 5-page PDF with all sections

- [ ] **Step 8: Test alert banner (if applicable)**

If `totalRiesgo > 100000`:
1. Verify banner appears at bottom
2. Verify gradient background
3. Verify 4px red left border
4. Verify icon has drop-shadow glow
5. Verify valor amount has text-shadow

Expected: Alert clearly visible and styled

- [ ] **Step 9: Verify no console errors**

Open browser DevTools console  
Expected: No errors, no warnings related to AdminReportes

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "test(AdminReportes): verify all enterprise redesign features

- Confirmed animations sync with live state
- Confirmed gradients render on all components
- Confirmed counters appear in all filter chips
- Confirmed ranking visuals (medals, stars, trophy)
- Confirmed PDF generation with Maylo watermark
- Confirmed highlighting for inventory issues
- All features working as specified"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Task 1: CSS animations (pulse-live, icon-float, icon-pulse, print styles)
- ✅ Task 2: Top 3 hours calculation with getHourRank
- ✅ Task 3: Filter chips enhanced styling
- ✅ Task 4: KPI cards with gradients and animations
- ✅ Task 5: Hourly chart with top 3 gradients
- ✅ Task 6: Balance bar with gradients and glowing dots
- ✅ Task 7: Inventory table with highlighting
- ✅ Task 8: Payment methods with counters and gradients
- ✅ Task 9: Top products with ranking medals
- ✅ Task 10: Employee stats with star for top
- ✅ Task 11: Shift details with trophy for top
- ✅ Task 12: Alert banner with enterprise styling
- ✅ Task 13: PDF with Maylo watermark and 4 sections
- ✅ Task 14: Integration testing

**No Placeholders:**
- ✅ All code blocks complete
- ✅ All colors specified (var(--*) or hex)
- ✅ All measurements specified (px, %, fr)
- ✅ All gradients fully defined
- ✅ All conditional logic specified

**Type Consistency:**
- ✅ `isLive` used consistently (boolean)
- ✅ `liveAnimations` state (boolean)
- ✅ `getHourRank` returns `1 | 2 | 3 | null`
- ✅ `topHours` object with `first`, `second`, `third` properties
- ✅ All color variables match spec

**No Gaps:**
- ✅ All 12 spec sections covered
- ✅ All visual requirements implemented
- ✅ All animations specified
- ✅ All counters added
- ✅ PDF structure complete

---

## Execution Complete

Plan saved to `docs/superpowers/plans/2026-06-07-admin-reportes-enterprise-redesign.md`

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task with two-stage review between tasks for fast iteration

**2. Inline Execution** — Execute all tasks in this session using executing-plans skill with checkpoint reviews

**Which approach?**
