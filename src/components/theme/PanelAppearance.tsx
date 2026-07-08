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
  glass: number;
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

// Solo familias auto-hospedadas vía next/font (ver app/layout.tsx y useTheme.ts).
export const APPEARANCE_FONTS = ['Plus Jakarta Sans', 'Space Grotesk'];

const FONT_PREVIEW: Record<string, string> = {
  'Plus Jakarta Sans': 'var(--font-jakarta)',
  'Space Grotesk': 'var(--font-grotesk)',
};

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
    glass: typeof pt.glass === 'number' ? pt.glass : 55,
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

      <Field label="Colores de tu marca">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {(['Principal', 'Secundario', 'Detalle'] as const).map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={theme.palette[i] ?? '#7F77DD'}
                onChange={e => {
                  const nextPalette = [...theme.palette];
                  nextPalette[i] = e.target.value;
                  onChange({ palette: nextPalette });
                }}
                style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--line)', cursor: 'pointer', background: 'transparent', padding: 2 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
                <div className="tnum" style={{ fontSize: 11, color: 'var(--muted)' }}>{(theme.palette[i] ?? '#7F77DD').toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.4 }}>
          Elige libremente los tonos de tu identidad. El color principal define botones, menú activo y acentos del panel.
        </p>
      </Field>

      <Field label="Sugerencias rápidas">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {APPEARANCE_PALETTES.map(p => {
            const active = p.c.every((col, i) => col === theme.palette[i]);
            return (
              <button
                key={p.name}
                type="button"
                className={'fchip' + (active ? ' on' : '')}
                onClick={() => onChange({ palette: p.c })}
                title={p.name}
              >
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {p.c.map(col => (
                    <span key={col} style={{ width: 10, height: 10, borderRadius: '50%', background: col, display: 'inline-block' }} />
                  ))}
                </span>
                {p.name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Tipografía">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {APPEARANCE_FONTS.map(f => (
            <button key={f} type="button"
              className={'fchip' + (theme.font === f ? ' on' : '')}
              style={{ fontFamily: `${FONT_PREVIEW[f]}, system-ui, sans-serif`, fontSize: 13 }}
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

      <Field label={`Efecto cristal — ${theme.glass}%`}>
        <input type="range" min={0} max={100} step={5} value={theme.glass}
          onChange={e => onChange({ glass: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...C, marginTop: 4 }}>
          <span>Sólido</span><span>Cristal</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>
          Translucidez y desenfoque tipo iOS en menú lateral, barra superior, ventanas y avisos.
        </p>
      </Field>
    </>
  );
}
