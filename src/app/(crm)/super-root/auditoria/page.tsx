import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRAuditoria } from '@/components/super-root/SRAuditoria';

export default async function SRAuditoriaPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="auditoria">
      <SRAuditoria />
    </SRShell>
  );
}
