'use client';

import { useEffect, useMemo, useState } from 'react';
import { canCustomizeTheme } from '@/lib/auth/theme-access';
import { createClient } from '@/lib/supabase/client';

interface ThemeCustomizerProps {
  profileId?: string;
  initialTheme?: Record<string, unknown>;
  onSaved?: (theme: Record<string, unknown>) => void;
}

const DEFAULT_PALETTE = ['#7F77DD', '#27C3D8', '#B57BE0'];

export default function ThemeCustomizer({ profileId, initialTheme = {}, onSaved }: ThemeCustomizerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState(profileId ?? '');
  const [hasAccess, setHasAccess] = useState(false);
  const [theme, setTheme] = useState<Record<string, unknown>>(initialTheme);

  useEffect(() => {
    let alive = true;

    async function loadAccess() {
      const id = profileId || (await supabase.auth.getUser()).data.user?.id || '';
      if (!id) return;
      if (alive) setUserId(id);
      const access = await canCustomizeTheme(id);
      if (alive) setHasAccess(access);
    }

    loadAccess();
    return () => { alive = false; };
  }, [profileId, supabase]);

  async function savePanelTheme(patch: { accent?: string; accent2?: string; accent3?: string }) {
    if (!userId) return;
    const currentPalette = Array.isArray(theme.palette) ? theme.palette as string[] : DEFAULT_PALETTE;
    const nextPalette = [
      patch.accent ?? currentPalette[0] ?? DEFAULT_PALETTE[0],
      patch.accent2 ?? currentPalette[1] ?? DEFAULT_PALETTE[1],
      patch.accent3 ?? currentPalette[2] ?? DEFAULT_PALETTE[2],
    ];
    const nextTheme = { ...theme, palette: nextPalette };
    setTheme(nextTheme);
    onSaved?.(nextTheme);
    await supabase.from('profiles').update({ panel_theme: nextTheme, color: nextPalette[0] }).eq('id', userId);
  }

  if (!hasAccess) {
    return (
      <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
        Solo Super Root, Super Admin y Admin personalizan colores.
      </div>
    );
  }

  const palette = Array.isArray(theme.palette) ? theme.palette as string[] : DEFAULT_PALETTE;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <ColorPicker label="Accent" value={palette[0]} onSave={(val) => savePanelTheme({ accent: val })} />
      <ColorPicker label="Accent 2" value={palette[1]} onSave={(val) => savePanelTheme({ accent2: val })} />
      <ColorPicker label="Accent 3" value={palette[2]} onSave={(val) => savePanelTheme({ accent3: val })} />
    </div>
  );
}

function ColorPicker({ label, value, onSave }: { label: string; value: string; onSave: (val: string) => void }) {
  const [color, setColor] = useState(value || '#7F77DD');

  useEffect(() => {
    setColor(value || '#7F77DD');
  }, [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label className="crm-label" style={{ minWidth: 80 }}>{label}</label>
      <input
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          onSave(e.target.value);
        }}
        style={{ width: 48, height: 48, cursor: 'pointer', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent' }}
      />
    </div>
  );
}
