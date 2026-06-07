import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SuperShell } from '../SuperShell';
import { SuperSoporte } from '@/components/super/SuperSoporte';

export default async function SuperSoportePage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  return (
    <SuperShell profile={profile} view="soporte">
      <SuperSoporte profile={profile} />
    </SuperShell>
  );
}
