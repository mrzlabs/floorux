import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRCuenta } from '@/components/super-root/SRCuenta';

export default async function SRCuentaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="cuenta">
      <SRCuenta profile={profile} />
    </SRShell>
  );
}
