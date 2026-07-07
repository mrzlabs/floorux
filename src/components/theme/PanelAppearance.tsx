'use client';

import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';

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
