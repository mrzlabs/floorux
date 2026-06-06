interface DonutData {
  name: string;
  color: string;
  v: number;
}

interface DonutProps {
  data: DonutData[];
  center: string;
}

export function Donut({ data, center }: DonutProps) {
  const total = data.reduce((s, d) => s + d.v, 0) || 1;
  let acc = 0;
  const stops = data.map(d => {
    const from = acc / total * 360; acc += d.v;
    const to = acc / total * 360;
    return `${d.color} ${from}deg ${to}deg`;
  }).join(',');

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="dc"><b>{center}</b><span>total noche</span></div>
      </div>
      <div className="legend">
        {data.map((d, i) => (
          <div className="legend-i" key={i}>
            <span className="dotc" style={{ background: d.color }} />
            {d.name}
            <b>{Math.round(d.v / total * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
