import { COPk } from '@/lib/utils';

interface BarData {
  v: number;
  d?: string;
  h?: string;
}

interface BarsProps {
  data: BarData[];
  fmt?: (n: number) => string;
  hotIndex?: number;
}

export function Bars({ data, fmt = COPk, hotIndex }: BarsProps) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className={'bar' + (i === hotIndex ? ' hot' : '')} style={{ height: Math.max(d.v / max * 100, 4) + '%' }}>
            <span className="blab">{fmt(d.v)}</span>
          </div>
          <div className="bar-d">{d.d || d.h}</div>
        </div>
      ))}
    </div>
  );
}

interface PayBarData {
  name: string;
  color: string;
  v: number;
}

interface PayBarsProps {
  data: PayBarData[];
  total: number;
}

export function PayBars({ data, total }: PayBarsProps) {
  return (
    <div>
      {data.map((p, i) => {
        const pct = total ? (p.v / total * 100) : 0;
        return (
          <div className="pbar-row" key={i}>
            <div className="pl"><span className="dotc" style={{ background: p.color }} />{p.name}</div>
            <div className="pbar-track">
              <div className="pbar-fill" style={{ width: pct + '%', background: p.color }} />
            </div>
            <div className="pv tnum">{COPk(p.v)}</div>
          </div>
        );
      })}
    </div>
  );
}
