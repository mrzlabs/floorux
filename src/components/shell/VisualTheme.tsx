'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface VisualConfig {
  mode: 'dark' | 'light';
  palette: string[];
}

const DEFAULT_VISUAL: VisualConfig = {
  mode: 'dark',
  palette: ['#7F77DD', '#27C3D8', '#B57BE0'],
};

export function getVisualConfig(settings: Record<string, unknown>): VisualConfig {
  const raw = settings.config_visual;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_VISUAL;

  const config = raw as Record<string, unknown>;
  const mode = config.mode === 'light' ? 'light' : 'dark';
  const palette = Array.isArray(config.palette)
    ? config.palette.filter((color): color is string => typeof color === 'string').slice(0, 3)
    : [];

  return {
    mode,
    palette: palette.length === 3 ? palette : DEFAULT_VISUAL.palette,
  };
}

export function applyVisualConfig(config: VisualConfig) {
  const root = document.documentElement;
  root.dataset.theme = config.mode;
  root.style.setProperty('--accent', config.palette[0]);
  root.style.setProperty('--accent2', config.palette[1]);
  root.style.setProperty('--accent3', config.palette[2]);
}

export function VisualTheme({ settings }: { settings: Record<string, unknown> }) {
  useEffect(() => {
    applyVisualConfig(getVisualConfig(settings));
  }, [settings]);

  return null;
}

export function CommerceVisualTheme({ comercioId }: { comercioId: string | null }) {
  useEffect(() => {
    if (!comercioId) return;

    let active = true;
    const supabase = createClient();

    async function loadTheme() {
      const { data } = await supabase
        .from('comercios')
        .select('settings')
        .eq('id', comercioId)
        .maybeSingle();

      if (active && data?.settings) {
        applyVisualConfig(getVisualConfig(data.settings as Record<string, unknown>));
      }
    }

    loadTheme();
    return () => {
      active = false;
    };
  }, [comercioId]);

  return null;
}
