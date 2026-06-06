import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRUsuarios } from '@/components/super-root/SRUsuarios';

export default async function SRUsuariosPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="usuarios">
      <SRUsuarios />
    </SRShell>
  );
}
