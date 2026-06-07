const PATHS: Record<string, string> = {
  super: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 12h.01M15 12h.01',
  admin: 'M3 21h18M4 21V8h16v13M9 12h6M9 16h6M8 8V5a4 4 0 0 1 8 0v3',
  empleado: 'M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  dash: 'M4 13h7V4H4v9Zm9 7h7v-9h-7v9ZM4 20h7v-4H4v4ZM13 9h7V4h-7v5Z',
  biz: 'M3 21h18M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M14 9h4a1 1 0 0 1 1 1v11M8 8h2M8 12h2M8 16h2',
  mesas: 'M5 11h14M6 11V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3M6 11l-1 8M18 11l1 8M9 11v4M15 11v4',
  box: 'M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  users: 'M17 20c0-2.7-2.2-5-5-5s-5 2.3-5 5M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20c0-2-1.3-3.7-3-4.3M19 11a3 3 0 0 0 0-6',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  user: 'M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  chev: 'M9 6l6 6-6 6',
  chevd: 'M6 9l6 6 6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  check: 'M5 12l5 5L20 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2',
  alert: 'M12 3l9 16H3L12 3ZM12 10v4M12 17h.01',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2',
  fire: 'M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1.5-.5-2.5C16 9 17 11 17 14a5 5 0 0 1-10 0c0-4 3-6 5-11Z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3ZM8 8h8M8 12h8M8 16h5',
  cash: 'M3 7h18v10H3zM3 11h18M7 14h3',
  tag: 'M3 12l8-8h8v8l-8 8-8-8ZM16 8h.01',
  bottle: 'M10 2h4M10 2v3.2c0 .6-.2 1.1-.6 1.5L8 8.2A3 3 0 0 0 7 10.4V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.6a3 3 0 0 0-1-2.2l-1.4-1.5a2 2 0 0 1-.6-1.5V2M7 13h10',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8ZM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22',
  /* extras activamente usados en el proyecto */
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  play: 'M7 5l12 7-12 7V5Z',
  stop: 'M6 6h12v12H6z',
  camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8ZM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z',
  sun: 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  power: 'M12 4v8M7 6a7 7 0 1 0 10 0',
  calendar: 'M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  table: 'M5 11h14M6 11V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3M6 11l-1 8M18 11l1 8M9 11v4M15 11v4',
};

export function Icon({ name, s = 20, sw = 1.8, color, style }: { name: string; s?: number; sw?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', ...style }}>
      <path d={PATHS[name] || PATHS.dash} />
    </svg>
  );
}
