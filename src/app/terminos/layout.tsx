import type { ReactNode } from 'react';

export default function TerminosLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflowY: 'scroll',
      WebkitOverflowScrolling: 'touch' as any,
      background: '#f5f6fb',
      color: '#191b27',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {children}
    </div>
  );
}
