import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmpShell } from '../EmpShell';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default async function EmpChatPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'empleado' || !profile.comercio_id) redirect('/login');
  const supabase = await createClient();
  const { data: comercio } = await supabase
    .from('comercios')
    .select('super_admin_id')
    .eq('id', profile.comercio_id)
    .single();
  const { data: localAdmins } = await supabase
    .from('profiles')
    .select('*')
    .eq('comercio_id', profile.comercio_id)
    .eq('role', 'admin')
    .eq('activo', true);
  const { data: owner } = comercio
    ? await supabase.from('profiles').select('*').eq('id', comercio.super_admin_id).eq('activo', true).maybeSingle()
    : { data: null };
  const contacts = [...(localAdmins ?? []), ...(owner ? [owner] : [])];

  return (
    <EmpShell profile={profile} view="chat">
      <div className="card" style={{ minHeight: 560, padding: 16 }}>
        <ChatPanel comercioId={profile.comercio_id} currentUser={profile} contacts={contacts} />
      </div>
    </EmpShell>
  );
}
