import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRComercios } from '@/components/super-root/SRComercios';

export default async function SRComerciosPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="comercios">
      <SRComercios />
    </SRShell>
  );
}
