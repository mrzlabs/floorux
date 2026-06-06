import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SuperShell } from '../SuperShell';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default async function SuperChatPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/login');
  const supabase = await createClient();
  const { data: comercios } = await supabase.from('comercios').select('id').eq('super_admin_id', profile.id);
  const ids = (comercios ?? []).map((c: any) => c.id);
  const { data: contacts } = ids.length
    ? await supabase.from('profiles').select('*').in('comercio_id', ids)
    : { data: [] };
  const comercioId = ids[0] ?? '';
  return (
    <SuperShell profile={profile} view="chat">
      <ChatPanel comercioId={comercioId} currentUser={profile} contacts={contacts ?? []} />
    </SuperShell>
  );
}
