interface ChipProps {
  children: React.ReactNode;
  color?: string;
}

export function Chip({ children, color = 'var(--muted)' }: ChipProps) {
  return (
    <span className="chip" style={{ background: color + '22', color }}>
      {children}
    </span>
  );
}
