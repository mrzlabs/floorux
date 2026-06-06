'use client';
import { useEffect, useRef, useState } from 'react';

interface MayloDockProps {
  onOpen: () => void;
  message: string;
  alerts?: number;
}

export function MayloDock({ onOpen, message, alerts = 0 }: MayloDockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState(true);

  useEffect(() => {
    const render = () => {
      if (!ref.current || typeof window === 'undefined') return false;
      const maylo = (window as typeof window & { maylo?: (opts: object) => string }).maylo;
      if (!maylo) return false;
      ref.current.innerHTML = maylo({ eyes: alerts ? 'curious' : 'open', mouth: 'talk', arms: 'wave', panel: false });
      return true;
    };
    if (render()) return;
    const timer = window.setInterval(() => {
      if (render()) window.clearInterval(timer);
    }, 120);
    return () => window.clearInterval(timer);
  }, [alerts]);

  return (
    <div className="maylo-dock">
      {peek && (
        <div className="peek" onClick={onOpen}>
          <button className="peek-x" onClick={event => { event.stopPropagation(); setPeek(false); }} aria-label="Cerrar mensaje">×</button>
          <div className="pkh">Maylo</div>
          <p>{message}</p>
        </div>
      )}
      <button className="fab" onClick={onOpen} aria-label="Abrir asistente Maylo">
        <span className="fab-ring" />
        <span className="fab-maylo" ref={ref} />
        {alerts > 0 && <span className="fab-badge">{alerts}</span>}
      </button>
    </div>
  );
}
