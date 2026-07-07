'use client';
// Bucket "avatars" debe existir en Supabase Storage con acceso público.
// Crearlo desde Dashboard → Storage → New bucket → nombre: "avatars" → Public: ON
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/ToastContext';
import type { Profile } from '@/types/db';

interface SRCuentaProps { profile: Profile }

export function SRCuenta({ profile }: SRCuentaProps) {
  const toast = useToast();
  const pt = profile.panel_theme as Record<string, unknown>;
  const [form, setForm] = useState({ full_name: profile.full_name, alias: profile.alias ?? '' });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [brandLogo, setBrandLogo] = useState(typeof pt.brandLogo === 'string' ? pt.brandLogo : '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function saveAll() {
    setSaving(true);
    const panel_theme: Record<string, unknown> = { ...(profile.panel_theme as Record<string, unknown>) };
    if (brandLogo) panel_theme.brandLogo = brandLogo;
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      alias: form.alias || null,
      panel_theme,
    }).eq('id', profile.id);
    if (error) { toast('No se pudo guardar', 'alert'); setSaving(false); return; }
    toast('Cambios guardados', 'check');
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `profiles/${profile.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast('No se pudo subir la foto', 'alert'); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
    setAvatarUrl(data.publicUrl + '?v=' + Date.now());
    setUploadingAvatar(false);
    toast('Foto actualizada', 'check');
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `profiles/${profile.id}/brand-logo.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast('No se pudo subir el logo', 'alert'); setUploadingLogo(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = data.publicUrl + '?v=' + Date.now();
    setBrandLogo(url);
    setUploadingLogo(false);
    toast('Logo actualizado. Guarda los cambios para persistir.', 'check');
  }

  const C = { fontSize: 13, color: 'var(--muted)' };
  const SEC = { fontSize: 14, fontWeight: 800, marginBottom: 12, marginTop: 4 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>

      {/* ── Perfil ── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Perfil</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          {/* avatar con cámara */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span
              className="avatar lg"
              style={{
                background: profile.color + '26', color: profile.color,
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: avatarUrl && !uploadingAvatar ? 'zoom-in' : undefined,
              }}
              onClick={() => avatarUrl && !uploadingAvatar && setShowPhoto(true)}
            >
              {uploadingAvatar
                ? <span className="live" style={{ fontSize: 11 }}><i /></span>
                : avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())
              }
            </span>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid var(--panel)',
                color: '#0b0a12', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Icon name="camera" s={13} />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{form.full_name || profile.full_name}</div>
            <div style={C}>Super Root · {profile.email}</div>
          </div>
        </div>
        <Field label="Nombre completo">
          <input className="inp" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </Field>
        <Field label="Alias">
          <input className="inp" value={form.alias} placeholder="Ej. Admin global…" onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
        </Field>
      </div>

      {/* ── Logo de marca ── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={SEC}>Logo de la sidebar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span className="brand-mark" style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grad)', boxShadow: '0 8px 22px -8px var(--accent)' }}>
              {uploadingLogo
                ? <span className="live" style={{ fontSize: 11 }}><i /></span>
                : brandLogo
                  ? <img src={brandLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}>
                      <path d="M5 19V8l7-4 7 4v11M9 19v-5h6v5" stroke="#0b0a12" strokeWidth="2" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="1.6" fill="#0b0a12" />
                    </svg>
              }
            </span>
            <button type="button" onClick={() => logoRef.current?.click()}
              style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--panel)', color: '#0b0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="camera" s={12} />
            </button>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Logo de la barra lateral</div>
            <div style={C}>Reemplaza el ícono de la casa. Cuadrado, máx. 2MB.</div>
            {brandLogo && (
              <button className="btn sm ghost" style={{ marginTop: 8, fontSize: 12 }}
                onClick={() => setBrandLogo('')}>
                Restaurar por defecto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Guardar ── */}
      <button className="btn pri block" onClick={saveAll} disabled={saving} style={{ fontSize: 15, height: 48 }}>
        <Icon name="check" /> {saving ? 'Guardando…' : 'Guardar todos los cambios'}
      </button>

      {/* ── Lightbox foto ── */}
      {showPhoto && avatarUrl && (
        <div
          onClick={() => setShowPhoto(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            style={{
              maxWidth: '80vw', maxHeight: '80vh',
              borderRadius: 16, objectFit: 'contain',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
