'use client';
import { useEffect } from 'react';

export function applyTheme(mode: string, palette?: string[]) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode || 'dark');
  if (palette && palette.length === 3) {
    root.style.setProperty('--accent', palette[0]);
    root.style.setProperty('--accent2', palette[1]);
    root.style.setProperty('--accent3', palette[2]);
  }
}

export function useTheme(mode: string, palette?: string[]) {
  useEffect(() => {
    applyTheme(mode, palette);
  }, [mode, palette?.join(',')]);
}
