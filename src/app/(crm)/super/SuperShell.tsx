'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { applyFullTheme } from '@/hooks/useTheme';
import { ToastProvider } from '@/components/ui/ToastContext';
import { useSupportBadge } from '@/hooks/useSupportBadge';
import { usePlanUsage } from '@/hooks/usePlanUsage';
import { createClient } from '@/lib/supabase/client';
import { ThemeModeToggle } from '@/components/theme/ThemeModeToggle';
import type { Profile, Comercio } from '@/types/db';

const NAV = [
  { href: '/super', label: 'Comercios', icon: 'biz', title: 'Comercios', sub: 'Tu red de discotecas y tabernas' },
  { href: '/super/reportes', label: 'Reportes', icon: 'chart', title: 'Reportes consolidados', sub: 'Toda la red en un vistazo' },
  { href: '/super/usuarios', label: 'Administradores', icon: 'users', title: 'Administradores', sub: 'Usuarios y logueos' },
  { href: '/super/chat', label: 'Chat', icon: 'chat', title: 'Chat', sub: 'Mensajes con tu equipo' },
  { href: '/super/soporte', label: 'Soporte', icon: 'alert', title: 'Soporte', sub: 'Canal directo con Super Root' },
  { href: '/super/cuenta', label: 'Mi cuenta', icon: 'user', title: 'Mi cuenta', sub: 'Perfil del super administrador' },
];

const HELP: Record<string, { guide: string[]; tips: string[] }> = {
  comercios: {
    guide: ['Revisa el estado de cada comercio.', 'Prioriza comercios sin actividad o con alertas.', 'Entra al comercio que requiere gestión.', 'Confirma que el responsable quede activo.'],
    tips: ['Compara actividad entre comercios antes de intervenir.', 'Revisa límites del plan si falta capacidad.', 'Usa la cuenta del comercio como fuente principal de operación.'],
  },
  reportes: {
    guide: ['Selecciona el periodo.', 'Compara ventas por comercio.', 'Identifica desviaciones o comercios inactivos.', 'Exporta o comparte el reporte cuando los datos cuadren.'],
    tips: ['Busca caídas de recaudo antes de revisar detalles.', 'Contrasta métodos de pago con operación real.', 'Prioriza comercios con variación alta.'],
  },
  usuarios: {
    guide: ['Ubica el administrador.', 'Revisa comercio asignado y último acceso.', 'Valida si debe mantenerse activo.', 'Aplica cambios solo si el comercio lo requiere.'],
    tips: ['Desactiva accesos que ya no operan.', 'Verifica correos antes de crear usuarios.', 'Mantén un administrador responsable por comercio.'],
  },
  chat: {
    guide: ['Selecciona conversación.', 'Lee el contexto previo.', 'Responde con instrucción clara.', 'Confirma seguimiento si hay bloqueo operativo.'],
    tips: ['Usa chat para coordinación rápida.', 'Escala a soporte si requiere trazabilidad.', 'Evita mezclar temas de comercios distintos.'],
  },
  soporte: {
    guide: ['Revisa tickets abiertos.', 'Clasifica urgencia e impacto.', 'Responde con acción concreta.', 'Cierra cuando el solicitante tenga solución.'],
    tips: ['Prioriza bloqueos de caja, mesas e inventario.', 'Pide evidencia cuando falten datos.', 'Agrupa incidentes repetidos por comercio.'],
  },
  cuenta: {
    guide: ['Revisa datos del perfil.', 'Actualiza identidad y preferencias.', 'Verifica límites de plan.', 'Guarda y confirma que el panel conserve los cambios.'],
    tips: ['Mantén datos de contacto actualizados.', 'Revisa uso del plan antes de crear más comercios.', 'Usa una identidad consistente para soporte.'],
  },
};

interface SuperShellProps {
  profile: Profile;
  view: string;
  children: React.ReactNode;
}

export function SuperShell({ profile, view, children }: SuperShellProps) {
  useEffect(() => {
    applyFullTheme(profile.panel_theme as Record<string, unknown>, profile.color);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [comercios, setComercios] = useState<Pick<Comercio, 'id' | 'name' | 'color' | 'photo_url'>[]>([]);
  const [bizIdx, setBizIdx] = useState(0);
  const supportBadge = useSupportBadge(profile.id);
  const planUsage = usePlanUsage(profile.id);
  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const fire = (msg: string) => { setToast({ msg }); setTimeout(() => setToast(null), 2400); };
  const supabase = createClient();

  // Cargar comercios del super_admin
  useEffect(() => {
    supabase
      .from('comercios')
      .select('id, name, color, photo_url')
      .eq('super_admin_id', profile.id)
      .order('name')
      .then(({ data }) => {
        if (data?.length) setComercios(data as Pick<Comercio, 'id' | 'name' | 'color' | 'photo_url'>[]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  // Rotación de fotos de comercios cada 3 s
  useEffect(() => {
    if (comercios.length <= 1) return;
    const t = setInterval(() => { setBizIdx(i => (i + 1) % comercios.length); }, 3000);
    return () => clearInterval(t);
  }, [comercios.length]);

  const currentBiz = comercios[bizIdx];
  const currentBizInitials = currentBiz
    ? currentBiz.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : undefined;

  const item = NAV.find(n => n.href === '/super/' + view || (view === 'comercios' && n.href === '/super')) ?? NAV[0];
  const nav = NAV.map(n => n.href === '/super/soporte' ? { ...n, badge: supportBadge } : n);
  const helpContent = HELP[view] ?? HELP.comercios;

  const { plan, comercios: usoCom, maxComercios, empleados: usoEmp, maxEmpleados } = planUsage;
  const pctCom = maxComercios >= 999 ? 100 : Math.min(100, (usoCom / maxComercios) * 100);
  const pctEmp = maxEmpleados >= 999 ? 100 : Math.min(100, (usoEmp / maxEmpleados) * 100);
  const usageWidget = plan ? (
    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
      {[
        { label: 'Comercios', uso: usoCom, max: maxComercios, pct: pctCom },
        { label: 'Empleados', uso: usoEmp, max: maxEmpleados, pct: pctEmp },
      ].map(({ label, uso, max, pct }) => (
        <div key={label} style={{ marginBottom: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span>{label}</span>
            <span style={{ color: pct >= 100 ? 'var(--red)' : 'var(--muted)' }}>
              {uso} / {max >= 999 ? '∞' : max}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: max >= 999 ? '100%' : `${pct}%`,
              background: pct >= 100 ? 'var(--red)' : pct > 80 ? 'var(--orange)' : 'var(--accent)',
              opacity: max >= 999 ? 0.2 : 1,
              transition: 'width .3s',
            }} />
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="app">
      <Sidebar
        profile={profile}
        navItems={nav}
        shopName={profile.alias ?? profile.full_name}
        shopSub={`Super Admin · ${currentBiz?.name ?? profile.email}`}
        shopColor={profile.color}
        shopImg={profile.avatar_url ?? null}
        brandSub={currentBiz?.name ?? 'Red de comercios'}
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        brandLogo={currentBiz?.photo_url ?? null}
        brandFallbackColor={currentBiz?.color ?? profile.color}
        brandFallbackInitials={currentBizInitials ?? 'FX'}
        navFooter={
          <>
            <ThemeModeToggle
              profileId={profile.id}
              initialMode={(profile.panel_theme as Record<string, unknown>)?.mode === 'light' ? 'light' : 'dark'}
              onModeChange={(mode) => applyFullTheme({ ...(profile.panel_theme as Record<string, unknown>), mode }, profile.color)}
            />
            {usageWidget}
          </>
        }
      />
      {sideOpen && <div className="scrim" style={{ zIndex: 99 }} onClick={() => setSideOpen(false)} />}
      <main className="main">
        <Topbar title={item.title} sub={item.sub} onMenu={() => setSideOpen(true)} onHelp={() => setHelp(h => !h)} />
        <div className="content">
          <ToastProvider toast={fire}>{children}</ToastProvider>
        </div>
      </main>
      <MayloDrawer
        open={help}
        onClose={() => setHelp(false)}
        roleLabel="Super Admin"
        intro="Soy Maylo, tu copiloto de la red. Vigilo el recaudo de cada comercio y te aviso si alguno se cae o se desconecta."
        alerts={[]}
        screenLabel={item.title}
        guideSteps={helpContent.guide}
        suggestions={helpContent.tips}
        tips={helpContent.tips}
        dancing={dancing}
        onDance={() => { setDancing(true); fire('Maylo activado'); setTimeout(() => setDancing(false), 4800); }}
      />
      <MayloDock onOpen={() => setHelp(true)} message="Tu red está lista. Abre este panel para revisar alertas y acciones." />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
