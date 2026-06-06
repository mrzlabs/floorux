function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function Avatar({ name, color = '#7F77DD', size = '', img }: {
  name: string; color?: string; size?: string; img?: string;
}) {
  return (
    <span className={'avatar ' + size} style={{ background: color + '26', color }}>
      {img ? <img src={img} alt="" /> : initials(name)}
    </span>
  );
}
