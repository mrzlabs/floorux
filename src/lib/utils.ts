export const COP = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-CO');

export const COPk = (n: number) => {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + n;
};

export const initials = (name: string) =>
  name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export function exportCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map(r =>
      r.map(c => {
        const s = String(c == null ? '' : c);
        return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',')
    ).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const DEMO_TODAY = new Date(2026, 5, 5);
export const MES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const parseISO = (s: string) => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };
export const fmtShort = (s: string) => { const d = parseISO(s); return `${d.getDate()} ${MES_ES[d.getMonth()]}`; };
export const rangeDays = (from: string, to: string) =>
  Math.max(1, Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 864e5) + 1);
export const rangeLabel = (r: { from: string; to: string }) =>
  r.from === r.to ? fmtShort(r.from) : `${fmtShort(r.from)} – ${fmtShort(r.to)}`;

export function presetRange(p: string): { from: string; to: string } {
  const t = new Date(DEMO_TODAY), mk = (d: Date) => isoDate(d);
  if (p === 'hoy') return { from: mk(t), to: mk(t) };
  if (p === 'ayer') { const y = new Date(t); y.setDate(t.getDate()-1); return { from: mk(y), to: mk(y) }; }
  if (p === '7') { const f = new Date(t); f.setDate(t.getDate()-6); return { from: mk(f), to: mk(t) }; }
  if (p === '30') { const f = new Date(t); f.setDate(t.getDate()-29); return { from: mk(f), to: mk(t) }; }
  return { from: mk(t), to: mk(t) };
}
export function matchPreset(r: { from: string; to: string }) {
  for (const k of ['hoy','ayer','7','30']) {
    const p = presetRange(k); if (p.from === r.from && p.to === r.to) return k;
  }
  return 'custom';
}
