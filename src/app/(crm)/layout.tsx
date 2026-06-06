import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (!profile.activo) redirect('/login?error=cuenta_suspendida');
  return <>{children}</>;
}
