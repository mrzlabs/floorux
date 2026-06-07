'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/ToastContext';
import { applyVisualConfig, getVisualConfig, type VisualConfig } from '@/components/shell/VisualTheme';
import type { Comercio, Profile, SubscriptionHistory } from '@/types/db';

const PALETTES = [
  { name: 'Violeta', c: ['#7F77DD', '#27C3D8', '#B57BE0'] },
  { name: 'Fuego',   c: ['#F5634A', '#F5A623', '#E040FB'] },
  { name: 'Bosque',  c: ['#34d399', '#3b82f6', '#a78bfa'] },
  { name: 'Rosa',    c: ['#f472b6', '#fb923c', '#a78bfa'] },
  { name: 'Hielo',   c: ['#38bdf8', '#22d3ee', '#818cf8'] },
  { name: 'Oro',     c: ['#F5C400', '#f59e42', '#E0708A'] },
];

const PLAN_LIMITES: Record<string, { comercios: number; empleados: number }> = {
  'Básico':     { comercios: 1, empleados: 3   },
  'Pro':        { comercios: 1, empleados: 999 },
  'Red':        { comercios: 5, empleados: 999 },
  'Enterprise': { comercios: 999, empleados: 999 },
};

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)', activo: 'var(--green)',
  trial:  'var(--yellow)',
  due:    'var(--orange)',
  suspended: 'var(--muted)', suspendido: 'var(--muted)',
  cancelled: 'var(--red)',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Activo', activo: 'Activo',
  trial:  'Trial',
  due:    'Vencido',
  suspended: 'Suspendido', suspendido: 'Suspendido',
  cancelled: 'Cancelado',
};

function daysLeft(end?: string | null) {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - Date.now()) / 864e5);
}

interface SuperCuentaProps {
  profile: Profile;
}

export function SuperCuenta({ profile }: SuperCuentaProps) {
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: profile.full_name,
    alias: profile.alias ?? '',
    phone: profile.phone ?? '',
    email: profile.email,
  });
  const [visual, setVisual] = useState<VisualConfig>(() => getVisualConfig(profile.panel_theme, profile.color));
  const [savingVisual, setSavingVisual] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.avatar_url ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [empleadosCount, setEmpleadosCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('comercios').select('*').eq('super_admin_id', profile.id).order('name')
      .then(async ({ data }) => {
        const rows = (data ?? []) as Comercio[];
        setComercios(rows);
        if (rows.length) {
          const ids = rows.map(c => c.id);
          const [{ data: histRows }, { count }] = await Promise.all([
            supabase.from('subscription_history').select('*').in('comercio_id', ids).order('created_at', { ascending: false }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('super_admin_id', profile.id).eq('role', 'empleado'),
          ]);
          setHistory((histRows ?? []) as SubscriptionHistory[]);
          setEmpleadosCount(count ?? 0);
        }
      });
  }, [profile.id]);

  // El primer comercio activo como referencia del plan
  const mainComercio = comercios.find(c => ['activo', 'active', 'trial'].includes(c.subscription_status)) ?? comercios[0];
  const planNombre = mainComercio?.plan ?? '—';
  const limites = PLAN_LIMITES[planNombre] ?? { comercios: 1, empleados: 3 };
  const dias = daysLeft(mainComercio?.subscription_end);
  const totalDias = mainComercio
    ? Math.max(1, Math.ceil((new Date(mainComercio.subscription_end ?? '').getTime() - new Date(mainComercio.subscription_start).getTime()) / 864e5))
    : 30;
  const progresoDias = dias !== null ? Math.max(0, Math.min(100, (dias / totalDias) * 100)) : 0;
  const progComercio = Math.min(100, (comercios.length / (limites.comercios === 999 ? 1 : limites.comercios)) * 100);
  const progEmpleado = limites.empleados === 999 ? 0 : Math.min(100, (empleadosCount / limites.empleados) * 100);

  async function save() {
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      alias: form.alias || null,
      phone: form.phone || null,
    }).eq('id', profile.id);
    setSavingProfile(false);
    if (error) { toast('No se pudo actualizar el perfil', 'alert'); return; }
    toast('Perfil actualizado', 'check');
  }

  async function savePersonalVisual(next: VisualConfig) {
    const previous = visual;
    setVisual(next);
    setSavingVisual(true);
    applyVisualConfig(next);
    const { error } = await supabase.from('profiles').update({
      panel_theme: next, color: next.palette[0],
    }).eq('id', profile.id);
    if (error) {
      setVisual(previous); applyVisualConfig(previous);
      toast('No se pudo guardar la personalización', 'alert');
    } else {
      toast('Personalización actualizada', 'check');
    }
    setSavingVisual(false);
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    setUploadingPhoto(true);
    const path = `${profile.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('floorux-media').upload(path, file);
    if (error) { toast('No se pudo subir la imagen', 'alert'); setUploadingPhoto(false); return; }
    const { data } = supabase.storage.from('floorux-media').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
    setPhotoUrl(data.publicUrl);
    setUploadingPhoto(false);
    toast('Foto actualizada', 'check');
  }

  const F13 = { fontSize: 13 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ─── PERFIL ──────────────────────────────────────── */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 20 }}>Perfil</h2>

        {/* Avatar clickeable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
            <Avatar name={form.full_name || profile.full_name} color={visual.palette[0]} size="lg" img={photoUrl || undefined} />
            <span style={{
              position: 'absolute', bottom: 0, right: 0, width: 22, height: 22,
              background: 'var(--accent)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}>
              {uploadingPhoto
                ? <span className="live" style={{ transform: 'scale(.6)' }}><i /></span>
                : <Icon name="camera" s={12} />}
            </span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{profile.full_name}</div>
            <div className="muted" style={F13}>Super Admin · {profile.email}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => uploadAvatar(e.target.files?.[0])} />
        </div>

        <div className="grid g2">
          <Field label="Nombre completo">
            <input className="inp" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Alias">
            <input className="inp" value={form.alias} placeholder="Ej. El jefe, La dueña…"
              onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
          </Field>
          <Field label="Teléfono">
            <input className="inp" type="tel" value={form.phone} placeholder="+57 300 000 0000"
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Correo electrónico">
            <input className="inp" type="email" value={form.email} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </Field>
        </div>
        <button className="btn pri" style={{ marginTop: 18 }} onClick={save} disabled={savingProfile}>
          <Icon name="check" /> Guardar perfil
        </button>
      </div>

      {/* ─── APARIENCIA ──────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Apariencia del panel</h2>
        <Field label="Tema">
          <div className="theme-seg">
            <button disabled={savingVisual} className={visual.mode === 'dark' ? 'on' : ''}
              onClick={() => savePersonalVisual({ ...visual, mode: 'dark' })}>
              <Icon name="moon" s={16} /> Oscuro
            </button>
            <button disabled={savingVisual} className={visual.mode === 'light' ? 'on' : ''}
              onClick={() => savePersonalVisual({ ...visual, mode: 'light' })}>
              <Icon name="sun" s={16} /> Claro
            </button>
          </div>
        </Field>
        <Field label="Paleta">
          <div className="swatches">
            {PALETTES.map(p => {
              const active = p.c.every((c, i) => c === visual.palette[i]);
              return (
                <button key={p.name}
                  className={'swatch' + (active ? ' on' : '')}
                  style={{ background: `linear-gradient(135deg, ${p.c.join(', ')})` }}
                  title={p.name} aria-label={p.name}
                  disabled={savingVisual}
                  onClick={() => savePersonalVisual({ ...visual, palette: p.c })} />
              );
            })}
          </div>
        </Field>
      </div>

      {/* ─── SUSCRIPCIÓN ─────────────────────────────────── */}
      {mainComercio && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Mi suscripción</h2>

          <div className="grid g2" style={{ marginBottom: 16 }}>
            <div>
              <div className="muted" style={F13}>Plan</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', marginTop: 2 }}>{planNombre}</div>
            </div>
            <div>
              <div className="muted" style={F13}>Estado</div>
              <div style={{ marginTop: 4 }}>
                <Chip color={STATUS_COLOR[mainComercio.subscription_status] ?? 'var(--muted)'}>
                  {STATUS_LABEL[mainComercio.subscription_status] ?? mainComercio.subscription_status}
                </Chip>
              </div>
            </div>
            <div>
              <div className="muted" style={F13}>Precio mensual</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                {'$' + Math.round(mainComercio.plan_cost ?? 0).toLocaleString('es-CO')}
              </div>
            </div>
            <div>
              <div className="muted" style={F13}>Modalidad</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2, textTransform: 'capitalize' }}>
                {(mainComercio.billing_cycle as string | undefined) ?? 'mensual'}
              </div>
            </div>
            <div>
              <div className="muted" style={F13}>Inicio</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{mainComercio.subscription_start}</div>
            </div>
            <div>
              <div className="muted" style={F13}>Vencimiento</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{mainComercio.subscription_end ?? '—'}</div>
            </div>
          </div>

          {/* Barra días restantes */}
          {dias !== null && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={F13}>Días restantes</span>
                <b style={{ fontSize: 13, color: dias < 7 ? 'var(--red)' : 'var(--ink)' }}>
                  {dias > 0 ? `${dias} días` : 'Vencida'}
                </b>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'var(--border)' }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width .4s',
                  width: `${progresoDias}%`,
                  background: dias < 7 ? 'var(--red)' : dias < 15 ? 'var(--orange)' : 'var(--green)',
                }} />
              </div>
            </div>
          )}

          {/* Límites del plan */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>LÍMITES DEL PLAN</div>
            <div className="grid g2" style={{ gap: 10 }}>
              {/* Comercios */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={F13}>Comercios</span>
                  <b style={{ fontSize: 13, color: progComercio >= 100 ? 'var(--red)' : 'var(--ink)' }}>
                    {comercios.length} / {limites.comercios === 999 ? '∞' : limites.comercios}
                  </b>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width .4s',
                    width: limites.comercios === 999 ? '100%' : `${progComercio}%`,
                    background: progComercio >= 100 ? 'var(--red)' : 'var(--accent)',
                    opacity: limites.comercios === 999 ? 0.25 : 1,
                  }} />
                </div>
              </div>
              {/* Empleados */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={F13}>Empleados</span>
                  <b style={{ fontSize: 13, color: progEmpleado >= 100 ? 'var(--red)' : 'var(--ink)' }}>
                    {empleadosCount} / {limites.empleados === 999 ? '∞' : limites.empleados}
                  </b>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width .4s',
                    width: limites.empleados === 999 ? '100%' : `${progEmpleado}%`,
                    background: progEmpleado >= 100 ? 'var(--red)' : 'var(--accent2)',
                    opacity: limites.empleados === 999 ? 0.25 : 1,
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── HISTORIAL ───────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Historial de suscripción</h2>
        {history.length === 0 ? (
          <p className="muted" style={F13}>Sin registros de historial.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={F13}>
              <thead>
                <tr>
                  <th style={F13}>Fecha</th>
                  <th style={F13}>Plan</th>
                  <th style={F13}>Monto</th>
                  <th style={F13}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 12).map(h => (
                  <tr key={h.id}>
                    <td className="muted" style={F13}>{h.starts_at}</td>
                    <td style={{ fontWeight: 700, ...F13 }}>{h.plan}</td>
                    <td style={F13}>{'$' + Math.round(h.cost).toLocaleString('es-CO')}</td>
                    <td>
                      <Chip color={
                        h.status === 'active' ? 'var(--green)' :
                        h.status === 'expired' ? 'var(--orange)' :
                        h.status === 'cancelled' ? 'var(--red)' : 'var(--muted)'
                      }>{h.status}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── POLÍTICAS ───────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Políticas de uso</h2>
        <p style={{ ...F13, lineHeight: 1.7, color: 'var(--muted)' }}>
          Al usar FloorUX aceptas nuestros términos de servicio y política de privacidad. Tu información
          es tratada de forma segura y no es compartida con terceros. El acceso a la plataforma está
          sujeto al estado de tu suscripción. El incumplimiento de los términos puede derivar en la
          suspensión de la cuenta.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <a href="/terminos" className="btn sm ghost" target="_blank" rel="noreferrer">
            <Icon name="receipt" s={14} /> Términos de servicio
          </a>
          <a href="/privacidad" className="btn sm ghost" target="_blank" rel="noreferrer">
            <Icon name="lock" s={14} /> Política de privacidad
          </a>
        </div>
      </div>

      {/* ─── SOPORTE ────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Soporte</h2>
        <p className="muted" style={F13}>Contacta directamente a Super Root para resolver dudas, reportar problemas o gestionar tu suscripción.</p>
        <a href="/super/soporte" className="btn pri" style={{ marginTop: 12 }}>
          <Icon name="chat" s={15} /> Ir al canal de soporte
        </a>
      </div>

    </div>
  );
}
