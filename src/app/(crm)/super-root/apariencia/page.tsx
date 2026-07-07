import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRApariencia } from '@/components/super-root/SRApariencia';

export default async function SRAparienciaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="apariencia">
      <SRApariencia profile={profile} />
    </SRShell>
  );
}
