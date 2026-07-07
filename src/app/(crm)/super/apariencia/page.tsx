import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SuperShell } from '../SuperShell';
import { SuperApariencia } from '@/components/super/SuperApariencia';

export default async function SuperAparienciaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  return (
    <SuperShell profile={profile} view="apariencia">
      <SuperApariencia profile={profile} />
    </SuperShell>
  );
}
