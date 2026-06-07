'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError('El enlace venció o la sesión de recuperación no es válida.');
      return;
    }
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <form className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }} onSubmit={save}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Crear nueva contraseña</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>Define la nueva clave de acceso.</p>
        {error && <div className="alert-banner" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="field"><label>Nueva contraseña</label><input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
        <div className="field"><label>Confirmar contraseña</label><input className="inp" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
        <button className="btn pri block" type="submit" disabled={saving}>{saving ? 'Actualizando' : 'Actualizar contraseña'}</button>
      </form>
    </main>
  );
}
