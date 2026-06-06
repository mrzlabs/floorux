import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SuperShell } from './SuperShell';
import { SuperComercios } from '@/components/super/SuperComercios';

export default async function SuperPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  return (
    <SuperShell profile={profile} view="comercios">
      <SuperComercios superAdminId={profile.id} />
    </SuperShell>
  );
}
