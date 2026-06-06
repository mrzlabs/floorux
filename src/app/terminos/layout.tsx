import type { ReactNode } from 'react';

export default function TerminosLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch' as any,
      background: 'var(--bg, #eef0f6)',
      color: 'var(--ink, #191b27)',
    }}>
      {children}
    </div>
  );
}
