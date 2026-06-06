import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SuperShell } from '../SuperShell';
import { SuperUsuarios } from '@/components/super/SuperUsuarios';

export default async function SuperUsuariosPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  return (
    <SuperShell profile={profile} view="usuarios">
      <SuperUsuarios superAdminId={profile.id} />
    </SuperShell>
  );
}
