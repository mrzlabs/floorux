import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRIntegraciones } from '@/components/super-root/SRIntegraciones';

export default async function SRIntegracionesPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="integraciones">
      <SRIntegraciones />
    </SRShell>
  );
}
