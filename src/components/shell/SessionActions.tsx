'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/ui/Icon';

interface SessionActionsProps {
  returnPath?: string | null;
}

export function SessionActions({ returnPath }: SessionActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function exitOperation() {
    setLoading(true);
    await fetch('/api/operate', { method: 'DELETE' });
    router.replace(returnPath || '/');
    router.refresh();
  }

  async function logout() {
    setLoading(true);
    await fetch('/api/operate', { method: 'DELETE' });
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="session-actions">
      {returnPath && (
        <button type="button" className="session-btn" onClick={exitOperation} disabled={loading}>
          <Icon name="chev" s={16} />
          <span>Volver a control</span>
        </button>
      )}
      <button type="button" className="session-btn danger" onClick={logout} disabled={loading}>
        <Icon name="power" s={16} />
        <span>Cerrar sesión</span>
      </button>
    </div>
  );
}
