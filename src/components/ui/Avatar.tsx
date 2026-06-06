import { initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  color?: string;
  size?: string;
  img?: string;
}

export function Avatar({ name, color = '#7F77DD', size = '', img }: AvatarProps) {
  return (
    <span className={'avatar ' + size} style={{ background: color + '26', color }}>
      {img ? <img src={img} alt="" /> : initials(name)}
    </span>
  );
}
