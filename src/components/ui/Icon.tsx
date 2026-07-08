import {
  Armchair,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  ChartColumn,
  ChartLine,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock,
  Crown,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  Flame,
  Globe,
  History,
  LayoutDashboard,
  Link2,
  Lock,
  Martini,
  Megaphone,
  Menu,
  MessageCircle,
  Minus,
  Moon,
  Package,
  PenLine,
  Play,
  Plug,
  Plus,
  Power,
  ReceiptText,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Sparkles,
  Square,
  Store,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  TriangleAlert,
  UserRound,
  Users,
  UsersRound,
  Wine,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/* Glifos de marca (lucide no incluye brand icons) — trazo outline consistente */
const BRAND_PATHS: Record<string, string> = {
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17.3 6.7h.01',
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z',
  whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3ZM8.8 8.6c.2-.5.5-.5.7-.5h.6c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.2.1.3 0 .5-.3.6-.7.8-.5 1.2.8 1.3 1.8 2 3 2.5.3.1.5 0 .7-.2l.7-.8c.2-.3.4-.2.7-.1l1.7.8c.3.1.5.2.5.4 0 .3 0 .9-.4 1.4-.4.5-1.3 1-1.9 1-1.6 0-3.6-.9-5-2.2-1.5-1.4-2.6-3.3-2.6-4.7 0-.6.2-1.2.4-1.6Z',
};

const ICONS: Record<string, LucideIcon> = {
  super: Crown,
  admin: Store,
  empleado: UserRound,
  dash: LayoutDashboard,
  biz: Building2,
  mesas: Armchair,
  box: Package,
  chart: ChartColumn,
  users: Users,
  bell: Bell,
  user: CircleUserRound,
  plus: Plus,
  minus: Minus,
  close: X,
  search: Search,
  chev: ChevronRight,
  chevd: ChevronDown,
  menu: Menu,
  check: Check,
  clock: Clock,
  download: Download,
  edit: PenLine,
  trash: Trash2,
  spark: Sparkles,
  alert: TriangleAlert,
  history: History,
  fire: Flame,
  lock: Lock,
  receipt: ReceiptText,
  cash: Banknote,
  tag: Tag,
  bottle: Martini,
  wine: Wine,
  eye: Eye,
  'eye-off': EyeOff,
  chat: MessageCircle,
  send: Send,
  play: Play,
  stop: Square,
  camera: Camera,
  moon: Moon,
  sun: Sun,
  power: Power,
  calendar: CalendarDays,
  table: Armchair,
  plug: Plug,
  clients: UsersRound,
  megaphone: Megaphone,
  rocket: Rocket,
  workflow: Workflow,
  filecheck: FileCheck2,
  globe: Globe,
  link: Link2,
  trending: TrendingUp,
  chartline: ChartLine,
  refresh: RefreshCw,
  zap: Zap,
};

export function Icon({ name, s = 20, sw = 1.8, color, style }: { name: string; s?: number; sw?: number; color?: string; style?: React.CSSProperties }) {
  const brand = BRAND_PATHS[name];
  if (brand) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'}
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', ...style }}>
        <path d={brand} />
      </svg>
    );
  }
  const Glyph = ICONS[name] ?? LayoutDashboard;
  return (
    <Glyph
      size={s}
      strokeWidth={sw}
      color={color || 'currentColor'}
      absoluteStrokeWidth={false}
      style={{ flex: 'none', ...style }}
    />
  );
}
