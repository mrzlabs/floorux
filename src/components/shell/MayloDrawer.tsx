'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Alert {
  icon: string;
  color: string;
  title: string;
  body: string;
}

interface MayloDrawerProps {
  open: boolean;
  onClose: () => void;
  roleLabel: string;
  intro: string;
  alerts: Alert[];
  tips: string[];
  dancing: boolean;
  onDance: () => void;
}

export function MayloDrawer({ open, onClose, roleLabel, intro, alerts, tips, dancing, onDance }: MayloDrawerProps) {
  const mayloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mayloRef.current) return;
    // @ts-ignore
    if (typeof window.maylo === 'function') {
      // @ts-ignore
      mayloRef.current.innerHTML = window.maylo({ eyes: dancing ? 'happy' : 'open', mouth: 'talk', arms: 'wave', panel: true });
    }
  }, [dancing, open]);

  return (
    <div className={'drawer' + (open ? ' open' : '')}>
      <div className="drawer-top">
        <div className="dr-maylo-wrap">
          <div className={'dr-maylo' + (dancing ? ' dancing' : '')} ref={mayloRef} />
        </div>
        <div className="dr-id"><b>Maylo</b><span>Asistente · {roleLabel}</span></div>
        <button className="dr-x" onClick={onClose}><Icon name="close" s={18} /></button>
      </div>
      <div className="bubble">{intro}</div>

      <div className="dr-sec">Alertas {alerts.length > 0 && `· ${alerts.length}`}</div>
      {alerts.length === 0
        ? <p className="muted" style={{ fontSize: 13 }}>Todo en orden por ahora. ✨</p>
        : (
          <div className="alerts">
            {alerts.map((a, i) => (
              <div className="alert-i" key={i}>
                <span className="aic" style={{ background: a.color + '22', color: a.color }}>
                  <Icon name={a.icon} s={16} />
                </span>
                <div><b>{a.title}</b><br /><span className="muted">{a.body}</span></div>
              </div>
            ))}
          </div>
        )}

      <div className="dr-sec">Tips para esta vista</div>
      <ul className="tips">
        {tips.map((t, i) => <li key={i}><span className="tk" />{t}</li>)}
      </ul>
      <button className="btn pri block" style={{ marginTop: 18 }} onClick={onDance}>
        🎺 ¡Que Maylo baile ska!
      </button>
    </div>
  );
}
