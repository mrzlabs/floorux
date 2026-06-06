import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRSoporte } from '@/components/super-root/SRSoporte';

export default async function SRSoportePage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return <SRShell profile={profile} view="soporte"><SRSoporte /></SRShell>;
}
