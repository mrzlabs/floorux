'use client';
import { useEffect } from 'react';

const THEME_COOKIE = 'floorux_theme';

function persistThemeCookie(mode: string, palette?: string[]) {
  if (typeof document === 'undefined') return;
  const payload = JSON.stringify({ mode, palette: palette && palette.length === 3 ? palette : undefined });
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(payload)}; path=/; max-age=31536000; samesite=lax`;
}

export function applyTheme(mode: string, palette?: string[]) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode || 'dark');
  if (palette && palette.length === 3) {
    root.style.setProperty('--accent', palette[0]);
    root.style.setProperty('--accent2', palette[1]);
    root.style.setProperty('--accent3', palette[2]);
  }
  persistThemeCookie(mode || 'dark', palette);
}

export function useTheme(mode: string, palette?: string[]) {
  useEffect(() => {
    applyTheme(mode, palette);
  }, [mode, palette?.join(',')]);
}

// Familias auto-hospedadas vía next/font en app/layout.tsx.
// Nombres antiguos guardados en panel_theme (DM Sans, Syne, Outfit) caen a Jakarta.
const FONT_VARS: Record<string, string> = {
  'Plus Jakarta Sans': 'var(--font-jakarta)',
  'Space Grotesk': 'var(--font-grotesk)',
};

export function applyFullTheme(pt: Record<string, unknown>, fallbackAccent = '#7F77DD') {
  const mode = pt.mode === 'light' ? 'light' : 'dark';
  const palette = Array.isArray(pt.palette) && (pt.palette as unknown[]).length === 3
    ? pt.palette as string[]
    : [fallbackAccent, '#27C3D8', '#B57BE0'];
  applyTheme(mode, palette);

  const root = document.documentElement;

  if (typeof pt.font === 'string' && pt.font) {
    const fontVar = FONT_VARS[pt.font] ?? 'var(--font-jakarta)';
    root.style.setProperty('--font', `${fontVar},system-ui,sans-serif`);
  }

  root.classList.toggle('compact', pt.density === 'compact');

  if (typeof pt.radius === 'number') {
    const r = pt.radius as number;
    root.style.setProperty('--r-lg', r + 'px');
    root.style.setProperty('--r-md', Math.round(r * 0.75) + 'px');
    root.style.setProperty('--r-sm', Math.round(r * 0.55) + 'px');
  }

  if (typeof pt.neuralOpacity === 'number') {
    const op = pt.neuralOpacity as number;
    root.style.setProperty('--np', Math.round(op / 100 * 26) + '%');
    root.style.setProperty('--np2', Math.round(op / 100 * 20) + '%');
  }

  // Efecto cristal: 0 = superficies opacas, 100 = máxima translucidez + blur
  if (typeof pt.glass === 'number') {
    const g = Math.max(0, Math.min(100, pt.glass as number));
    root.style.setProperty('--glass-pct', Math.round(100 - g * 0.45) + '%');
    root.style.setProperty('--glass-blur', Math.round(g * 0.24) + 'px');
  }
}
