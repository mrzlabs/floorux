import { Icon } from './Icon';

interface StatProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  trend?: number;
  sub?: string;
}

export function Stat({ label, value, icon, color = 'var(--accent)', trend, sub }: StatProps) {
  return (
    <div className="stat">
      <div className="sk">
        <span className="si" style={{ background: color + '22', color }}>
          <Icon name={icon} s={15} sw={2} />
        </span>
        {label}
      </div>
      <div className="sv">{value}</div>
      {trend != null && (
        <div className={'st ' + (trend >= 0 ? 'up' : 'down')}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs período anterior
        </div>
      )}
      {sub && <div className="st muted" style={{ fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}
