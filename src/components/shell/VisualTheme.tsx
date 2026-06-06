'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { applyTheme } from '@/hooks/useTheme';

export interface VisualConfig {
  mode: 'dark' | 'light';
  palette: string[];
}

const DEFAULT_VISUAL: VisualConfig = {
  mode: 'dark',
  palette: ['#7F77DD', '#27C3D8', '#B57BE0'],
};

export function getVisualConfig(settings: Record<string, unknown>, fallbackColor = DEFAULT_VISUAL.palette[0]): VisualConfig {
  const candidate = settings.config_visual ?? settings;
  const raw = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate
    : null;
  if (!raw) {
    return { ...DEFAULT_VISUAL, palette: [fallbackColor, DEFAULT_VISUAL.palette[1], DEFAULT_VISUAL.palette[2]] };
  }

  const config = raw as Record<string, unknown>;
  const mode = config.mode === 'light' ? 'light' : 'dark';
  const palette = Array.isArray(config.palette)
    ? config.palette.filter((color): color is string => typeof color === 'string').slice(0, 3)
    : [];

  return {
    mode,
    palette: palette.length === 3 ? palette : [fallbackColor, DEFAULT_VISUAL.palette[1], DEFAULT_VISUAL.palette[2]],
  };
}

export function applyVisualConfig(config: VisualConfig) {
  applyTheme(config.mode, config.palette);
}

export function VisualTheme({ settings, fallbackColor }: { settings: Record<string, unknown>; fallbackColor?: string }) {
  useEffect(() => {
    applyVisualConfig(getVisualConfig(settings, fallbackColor));
  }, [settings, fallbackColor]);

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
        .select('settings, color')
        .eq('id', comercioId)
        .maybeSingle();

      if (active && data?.settings) {
        applyVisualConfig(getVisualConfig(data.settings as Record<string, unknown>, data.color));
      }
    }

    loadTheme();

    const channel = supabase
      .channel(`theme-${comercioId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comercios', filter: `id=eq.${comercioId}` },
        (payload) => {
          const row = payload.new as { settings?: Record<string, unknown>; color?: string };
          if (row.settings) {
            applyVisualConfig(getVisualConfig(row.settings, row.color));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [comercioId]);

  return null;
}
