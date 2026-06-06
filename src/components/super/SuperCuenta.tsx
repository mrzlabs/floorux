'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/ToastContext';
import type { Profile } from '@/types/db';

interface SuperCuentaProps {
  profile: Profile;
}

export function SuperCuenta({ profile }: SuperCuentaProps) {
  const toast = useToast();
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '', color: profile.color });
  const supabase = createClient();

  async function save() {
    await supabase.from('profiles').update({ full_name: form.full_name, alias: form.alias || null, color: form.color }).eq('id', profile.id);
    toast('Perfil actualizado', 'check');
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 560, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar name={profile.full_name} color={profile.color} size="lg" img={profile.avatar_url ?? undefined} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{profile.full_name}</div>
            <div className="muted" style={{ fontSize: 13 }}>Super Admin · {profile.email}</div>
          </div>
        </div>

        <Field label="Nombre completo">
          <input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </Field>
        <Field label="Alias">
          <input className="inp" value={form.alias} placeholder="Ej. El jefe, La dueña…" onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
        </Field>
        <Field label="Color de marca">
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ height: 40, width: '100%', borderRadius: 8, border: 'none', cursor: 'pointer' }} />
        </Field>
        <button className="btn pri block" style={{ marginTop: 20 }} onClick={save}><Icon name="check" /> Guardar cambios</button>
      </div>
    </div>
  );
}
