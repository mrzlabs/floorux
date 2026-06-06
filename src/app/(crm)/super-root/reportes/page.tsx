import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRReportes } from '@/components/super-root/SRReportes';

export default async function SRReportesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="reportes">
      <Suspense fallback={<div className="muted" style={{ padding: 24, fontSize: 15 }}>Cargando reportes…</div>}>
        <SRReportes />
      </Suspense>
    </SRShell>
  );
}
