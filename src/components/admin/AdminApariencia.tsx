'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastContext';
import { applyFullTheme } from '@/hooks/useTheme';
import { PanelAppearance, getExtTheme, type ExtTheme } from '@/components/theme/PanelAppearance';
import type { Profile } from '@/types/db';

interface AdminAparienciaProps {
  profile: Profile;
}

export function AdminApariencia({ profile }: AdminAparienciaProps) {
  const toast = useToast();
  const supabase = createClient();
  const [theme, setTheme] = useState<ExtTheme>(() => getExtTheme(profile.panel_theme as Record<string, unknown>, profile.color));
  const [saving, setSaving] = useState(false);

  function live(patch: Partial<ExtTheme>) {
    const next = { ...theme, ...patch };
    setTheme(next);
    applyFullTheme(next as Record<string, unknown>, profile.color);
  }

  async function saveTheme() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      panel_theme: { ...(profile.panel_theme as Record<string, unknown>), ...theme },
      color: theme.palette[0],
    }).eq('id', profile.id);
    setSaving(false);
    if (error) { toast('No se pudo guardar las preferencias', 'alert'); return; }
    toast('Preferencias guardadas', 'check');
  }

  return (
    <div className="card" style={{ padding: 20, maxWidth: 640 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Apariencia de mi panel</h2>
      <PanelAppearance theme={theme} onChange={live} />
      <button className="btn pri block" style={{ marginTop: 18 }} onClick={saveTheme} disabled={saving}>
        <Icon name="check" /> {saving ? 'Guardando…' : 'Guardar preferencias'}
      </button>
    </div>
  );
}
