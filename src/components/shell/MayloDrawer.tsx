'use client';
import { useEffect, useRef, useState } from 'react';
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
  screenLabel?: string;
  guideSteps?: string[];
  suggestions?: string[];
  dancing: boolean;
  onDance: () => void;
}

type HelpMode = 'resumen' | 'guia' | 'sugerencias';

export function MayloDrawer({
  open, onClose, roleLabel, intro, alerts, tips,
  screenLabel = 'esta pantalla',
  guideSteps = [],
  suggestions,
  dancing, onDance,
}: MayloDrawerProps) {
  const mayloRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<HelpMode>('resumen');
  const currentSuggestions = suggestions?.length ? suggestions : tips;

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

      <div className="dr-sec">Opciones de ayuda</div>
      <div className="fbar" style={{ marginBottom: 0 }}>
        {[
          { id: 'resumen' as HelpMode, label: 'Resumen', icon: 'dash' },
          { id: 'guia' as HelpMode, label: 'Instructivo', icon: 'check' },
          { id: 'sugerencias' as HelpMode, label: 'Sugerencias', icon: 'spark' },
        ].map(option => (
          <button
            key={option.id}
            type="button"
            className={'fchip' + (mode === option.id ? ' on' : '')}
            onClick={() => setMode(option.id)}
          >
            <Icon name={option.icon} s={14} />
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'resumen' && (
        <>
          <div className="dr-sec">Gestión actual</div>
          <div className="alert-i">
            <span className="aic" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>
              <Icon name="dash" s={16} />
            </span>
            <div>
              <b>{screenLabel}</b><br />
              <span className="muted">Revisa primero la información crítica, luego aplica filtros y ejecuta acciones solo sobre registros verificados.</span>
            </div>
          </div>
        </>
      )}

      {mode === 'guia' && (
        <>
          <div className="dr-sec">Instructivo detallado</div>
          <ol className="tips" style={{ listStyle: 'none' }}>
            {(guideSteps.length ? guideSteps : [
              'Identifica el objetivo de la pantalla antes de modificar datos.',
              'Usa filtros o búsqueda para ubicar el registro correcto.',
              'Verifica valores, estado y responsable antes de guardar.',
              'Confirma que el cambio quede reflejado en la tabla o resumen.',
            ]).map((step, i) => (
              <li key={i}>
                <span className="tk" />
                <span><b>{i + 1}.</b> {step}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {mode === 'sugerencias' && (
        <>
          <div className="dr-sec">Sugerencias de gestión</div>
          <ul className="tips">
            {currentSuggestions.map((t, i) => <li key={i}><span className="tk" />{t}</li>)}
          </ul>
        </>
      )}

      <div className="dr-sec">Alertas {alerts.length > 0 && `· ${alerts.length}`}</div>
      {alerts.length === 0
        ? <p className="muted" style={{ fontSize: 13 }}>Todo en orden por ahora.</p>
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

      <button className="btn pri block" style={{ marginTop: 18 }} onClick={onDance}>
        Activar Maylo
      </button>
    </div>
  );
}
