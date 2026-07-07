'use client';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { MayloDrawer } from '@/components/shell/MayloDrawer';
import { MayloDock } from '@/components/shell/MayloDock';
import { applyFullTheme } from '@/hooks/useTheme';
import { ToastProvider } from '@/components/ui/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { useSupportBadge } from '@/hooks/useSupportBadge';
import { ThemeModeToggle } from '@/components/theme/ThemeModeToggle';
import type { Profile } from '@/types/db';

const NAV = [
  { href: '/super-root', label: 'Dashboard', icon: 'dash', title: 'Dashboard global', sub: 'Vista completa del sistema' },
  { href: '/super-root/super-admins', label: 'Super Admins', icon: 'super', title: 'Super Admins', sub: 'Gestión de franquiciados' },
  { href: '/super-root/comercios', label: 'Comercios', icon: 'biz', title: 'Todos los comercios', sub: 'Vista completa de la red' },
  { href: '/super-root/reportes', label: 'Reportes', icon: 'chart', title: 'Reportes de rentabilidad', sub: 'Suscripciones, ingresos y proyecciones' },
  { href: '/super-root/usuarios', label: 'Usuarios', icon: 'users', title: 'Usuarios', sub: 'Todos los usuarios del sistema' },
  { href: '/super-root/logs', label: 'Logs', icon: 'history', title: 'Logs de auditoría', sub: 'Registro de actividad' },
  { href: '/super-root/auditoria', label: 'Auditoría', icon: 'check', title: 'Auditoría de inventario', sub: 'Cuadre global inventario vs ventas' },
  { href: '/super-root/soporte', label: 'Soporte', icon: 'chat', title: 'Soporte de la red', sub: 'Solicitudes directas de Super Admins' },
  { href: '/super-root/apariencia', label: 'Apariencia', icon: 'spark', title: 'Apariencia', sub: 'Tema y colores de tu panel' },
  { href: '/super-root/cuenta', label: 'Mi cuenta', icon: 'user', title: 'Mi cuenta', sub: 'Perfil y logo de marca' },
];

const HELP: Record<string, { guide: string[]; tips: string[] }> = {
  dashboard: {
    guide: ['Revisa actividad global.', 'Detecta comercios o usuarios con comportamiento fuera de rango.', 'Abre la vista específica del módulo afectado.', 'Ejecuta seguimiento hasta confirmar estabilidad.'],
    tips: ['Prioriza señales de soporte, logs y auditoría.', 'No cambies usuarios sin validar comercio asociado.', 'Usa reportes para confirmar impacto económico.'],
  },
  'super-admins': {
    guide: ['Ubica el super admin.', 'Revisa comercios asignados y estado.', 'Valida datos de contacto.', 'Aplica cambios de acceso solo con trazabilidad.'],
    tips: ['Mantén responsables claros por red.', 'Revisa últimos accesos antes de suspender.', 'Confirma capacidad del plan antes de ampliar operación.'],
  },
  comercios: {
    guide: ['Filtra o busca el comercio.', 'Revisa estado, responsable y actividad.', 'Abre detalle si requiere corrección.', 'Confirma que la información quede sincronizada.'],
    tips: ['Agrupa comercios por responsable.', 'Detecta comercios sin actividad reciente.', 'Verifica identidad visual y datos básicos.'],
  },
  reportes: {
    guide: ['Define periodo de análisis.', 'Revisa ingresos, suscripciones y proyección.', 'Compara variaciones entre periodos.', 'Exporta solo cuando los totales estén consistentes.'],
    tips: ['Usa reportes para decisiones de plan.', 'Cruza ventas con soporte antes de intervenir.', 'Identifica comercios con caída sostenida.'],
  },
  usuarios: {
    guide: ['Busca el usuario.', 'Valida rol y comercio asignado.', 'Revisa estado activo.', 'Actualiza permisos solo si el rol coincide con la operación.'],
    tips: ['Evita usuarios sin comercio cuando no sean globales.', 'Desactiva accesos vencidos.', 'Revisa duplicados por correo.'],
  },
  logs: {
    guide: ['Filtra por usuario, comercio o acción.', 'Revisa hora y módulo afectado.', 'Compara con el reporte del usuario.', 'Documenta el hallazgo antes de corregir.'],
    tips: ['Usa logs para auditoría, no para suposiciones.', 'Prioriza acciones destructivas o cambios de permisos.', 'Cruza logs con soporte abierto.'],
  },
  auditoria: {
    guide: ['Selecciona comercio o periodo.', 'Compara inventario contra ventas.', 'Identifica diferencias relevantes.', 'Escala ajuste solo con evidencia.'],
    tips: ['Busca diferencias repetidas por producto.', 'Revisa cierres de turno antes de ajustar stock.', 'Documenta cualquier corrección manual.'],
  },
  soporte: {
    guide: ['Clasifica solicitudes por impacto.', 'Lee evidencia y contexto.', 'Responde con acción verificable.', 'Cierra cuando el requerimiento tenga solución confirmada.'],
    tips: ['Prioriza incidentes de operación en vivo.', 'Agrupa fallas repetidas por módulo.', 'Solicita captura si falta evidencia.'],
  },
  cuenta: {
    guide: ['Revisa datos de perfil.', 'Actualiza identidad visual si aplica.', 'Guarda cambios.', 'Confirma que la barra lateral refleje la identidad correcta.'],
    tips: ['Mantén la identidad global consistente.', 'Evita cambios de marca durante soporte activo.', 'Verifica permisos antes de editar configuración.'],
  },
  apariencia: {
    guide: ['Elige modo claro u oscuro.', 'Selecciona una paleta o define tus propios colores.', 'Ajusta tipografía, densidad y bordes a tu gusto.', 'Guarda para que el cambio persista entre sesiones.'],
    tips: ['El modo claro/oscuro también se cambia rápido desde el pie del menú.'],
  },
};

interface SRShellProps {
  profile: Profile;
  view: string;
  children: React.ReactNode;
}

export function SRShell({ profile, view, children }: SRShellProps) {
  const pt = profile.panel_theme as Record<string, unknown>;
  const [brandLogo, setBrandLogo] = useState<string>(
    typeof pt.brandLogo === 'string' ? pt.brandLogo : ''
  );
  const supportBadge = useSupportBadge(profile.id);

  useEffect(() => {
    applyFullTheme(pt, '#B57BE0');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sideOpen, setSideOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);
  const fire = (msg: string) => { setToast({ msg }); setTimeout(() => setToast(null), 2400); };
  const supabase = createClient();

  async function handleBrandLogoUpload(file: File) {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `profiles/${profile.id}/brand-logo.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { fire('No se pudo subir el logo'); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = data.publicUrl + '?v=' + Date.now();
    const updatedPt = { ...pt, brandLogo: url };
    await supabase.from('profiles').update({ panel_theme: updatedPt }).eq('id', profile.id);
    setBrandLogo(url);
    fire('Logo actualizado');
  }

  const item = NAV.find(n => n.href.includes(view)) ?? NAV[0];
  const nav = NAV.map(n => n.href === '/super-root/soporte' ? { ...n, badge: supportBadge } : n);
  const helpContent = HELP[view] ?? HELP.dashboard;

  return (
    <div className="app sr-shell">
      <style>{`.sr-shell .nav-i{font-size:15px}.sr-shell .nav-i svg{width:20px;height:20px}`}</style>
      <Sidebar
        profile={profile}
        navItems={nav}
        shopName="OperUX · Sistema"
        shopSub="Super Root · Control total"
        shopColor={profile.color}
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        brandLogo={brandLogo || null}
        onBrandLogoUpload={handleBrandLogoUpload}
        navFooter={
          <ThemeModeToggle
            profileId={profile.id}
            initialMode={pt.mode === 'light' ? 'light' : 'dark'}
            onModeChange={(mode) => applyFullTheme({ ...pt, mode }, '#B57BE0')}
          />
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
        roleLabel="Super Root"
        intro="Soy Maylo, tu asistente global. Te ayudo a supervisar franquiciados, comercios, usuarios, auditorías y actividad del sistema."
        alerts={[]}
        screenLabel={item.title}
        guideSteps={helpContent.guide}
        suggestions={helpContent.tips}
        tips={helpContent.tips}
        dancing={dancing}
        onDance={() => { setDancing(true); fire('Maylo está activo'); setTimeout(() => setDancing(false), 4800); }}
      />
      <MayloDock onOpen={() => setHelp(true)} message="Control global listo. Revisa actividad, suscripciones y alertas de inventario." />
      {help && <div className="scrim" style={{ zIndex: 85 }} onClick={() => setHelp(false)} />}
      {toast && <div className="toast">{toast.msg}</div>}
    </div>
  );
}
