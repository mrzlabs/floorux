import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from './SRShell';
import { SRDashboard } from '@/components/super-root/SRDashboard';

export default async function SuperRootPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="dashboard">
      <SRDashboard />
    </SRShell>
  );
}
