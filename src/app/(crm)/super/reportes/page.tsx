import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SuperShell } from '../SuperShell';
import { SuperReportes } from '@/components/super/SuperReportes';

export default async function SuperReportesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  return (
    <SuperShell profile={profile} view="reportes">
      <SuperReportes superAdminId={profile.id} />
    </SuperShell>
  );
}
