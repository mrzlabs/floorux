import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SuperShell } from '../SuperShell';
import { SuperCuenta } from '@/components/super/SuperCuenta';

export default async function SuperCuentaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  return (
    <SuperShell profile={profile} view="cuenta">
      <SuperCuenta profile={profile} />
    </SuperShell>
  );
}
