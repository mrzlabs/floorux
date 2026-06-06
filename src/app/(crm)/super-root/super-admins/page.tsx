import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRSuperAdmins } from '@/components/super-root/SRSuperAdmins';

export default async function SRSuperAdminsPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="super-admins">
      <SRSuperAdmins />
    </SRShell>
  );
}
