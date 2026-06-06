import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '../AdminShell';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default async function AdminChatPage() {
  const context = await getAdminContext();
  if (!context) redirect('/login');
  const { profile, operating, returnPath } = context;
  const supabase = await createClient();
  const { data: comercio } = await supabase.from('comercios').select('*').eq('id', profile.comercio_id).single();
  const { data: contacts } = await supabase.from('profiles').select('*').eq('comercio_id', profile.comercio_id).neq('id', profile.id);
  if (!comercio) redirect('/login');
  return (
    <AdminShell profile={profile} comercio={comercio} view="chat" operating={operating} returnPath={returnPath}>
      <ChatPanel comercioId={profile.comercio_id!} currentUser={profile} contacts={contacts ?? []} />
    </AdminShell>
  );
}
