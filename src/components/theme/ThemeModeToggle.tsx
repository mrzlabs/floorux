'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';

type ThemeMode = 'dark' | 'light';

interface ThemeModeToggleProps {
  profileId: string;
  initialMode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
}

export function ThemeModeToggle({ profileId, initialMode = 'dark', onModeChange }: ThemeModeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function toggleTheme() {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
    onModeChange?.(nextMode);
    setSaving(true);

    const { data } = await supabase
      .from('profiles')
      .select('panel_theme')
      .eq('id', profileId)
      .maybeSingle();

    await supabase
      .from('profiles')
      .update({ panel_theme: { ...(data?.panel_theme as Record<string, unknown> ?? {}), mode: nextMode } })
      .eq('id', profileId);

    setSaving(false);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn ghost"
      disabled={saving}
      style={{ width: '100%', justifyContent: 'flex-start' }}
      title="Cambiar tema"
    >
      <Icon name={mode === 'dark' ? 'sun' : 'moon'} s={15} />
      {mode === 'dark' ? 'Claro' : 'Oscuro'}
    </button>
  );
}
