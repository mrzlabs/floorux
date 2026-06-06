import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { SRShell } from '../SRShell';
import { SRLogs } from '@/components/super-root/SRLogs';

export default async function SRLogsPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_super_admin') redirect('/login');
  return (
    <SRShell profile={profile} view="logs">
      <SRLogs />
    </SRShell>
  );
}
