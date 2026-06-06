'use client';
import { Icon } from './Icon';
import { isoDate, DEMO_TODAY, presetRange, matchPreset } from '@/lib/utils';

interface Range { from: string; to: string; }

interface ReportToolbarProps {
  range: Range;
  setRange: (r: Range) => void;
  onCSV?: () => void;
  onPDF?: () => void;
  live?: boolean;
}

const PRESETS: [string, string][] = [['hoy','Hoy'],['ayer','Ayer'],['7','7 días'],['30','30 días']];

export function ReportToolbar({ range, setRange, onCSV, onPDF, live }: ReportToolbarProps) {
  const cur = matchPreset(range);
  return (
    <div className="rtoolbar">
      <div className="fbar" style={{ marginBottom: 0 }}>
        {PRESETS.map(([k, l]) => (
          <button key={k} className={'fchip' + (cur === k ? ' on' : '')} onClick={() => setRange(presetRange(k))}>{l}</button>
        ))}
        <div className="daterange">
          <Icon name="calendar" s={15} />
          <input type="date" value={range.from} max={range.to} onChange={e => setRange({ ...range, from: e.target.value })} />
          <span>–</span>
          <input type="date" value={range.to} min={range.from} max={isoDate(DEMO_TODAY)} onChange={e => setRange({ ...range, to: e.target.value })} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {live && <span className="live"><i />En vivo</span>}
        {onCSV && <button className="btn sm" onClick={onCSV}><Icon name="download" s={15} /> CSV</button>}
        {onPDF && <button className="btn sm pri" onClick={onPDF}><Icon name="download" s={15} /> PDF</button>}
      </div>
    </div>
  );
}
