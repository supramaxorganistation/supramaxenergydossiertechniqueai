import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

/**
 * Maps the web app's custom SVG icon names to Feather glyphs (near 1:1).
 * Unknown names fall back to `help-circle`.
 */
const FEATHER: Record<string, keyof typeof Feather.glyphMap> = {
  dashboard: 'grid',
  folder: 'folder',
  inbox: 'inbox',
  'file-text': 'file-text',
  clipboard: 'clipboard',
  building: 'briefcase',
  users: 'users',
  user: 'user',
  box: 'box',
  cart: 'shopping-cart',
  wallet: 'credit-card',
  settings: 'settings',
  'plus-circle': 'plus-circle',
  shield: 'shield',
  logout: 'log-out',
  sun: 'sun',
  zap: 'zap',
  check: 'check',
  x: 'x',
  'chevron-down': 'chevron-down',
  'chevron-right': 'chevron-right',
  'chevron-left': 'chevron-left',
  'check-circle': 'check-circle',
  'x-circle': 'x-circle',
  'alert-triangle': 'alert-triangle',
  clock: 'clock',
  calendar: 'calendar',
  banknote: 'dollar-sign',
  'bar-chart': 'bar-chart-2',
  'trending-up': 'trending-up',
  'trending-down': 'trending-down',
  refresh: 'refresh-cw',
  camera: 'camera',
  search: 'search',
  eye: 'eye',
  'eye-off': 'eye-off',
  key: 'key',
  'face-scan': 'smile',
  pen: 'edit-2',
  save: 'save',
  paperclip: 'paperclip',
  image: 'image',
  upload: 'upload',
  download: 'download',
  sparkle: 'star',
  bot: 'cpu',
  map: 'map-pin',
  'map-pin': 'map-pin',
  phone: 'phone',
  mail: 'mail',
  'log-in': 'log-in',
  plus: 'plus',
  trash: 'trash-2',
  edit: 'edit-2',
  home: 'home',
  layers: 'layers',
  'message-circle': 'message-circle',
  send: 'send',
  grid: 'grid',
  list: 'list',
  'more-vertical': 'more-vertical',
  menu: 'menu',
};

export type IconName = string;

export function Icon({
  name,
  size = 18,
  color = colors.foreground,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const glyph = FEATHER[name] ?? (name in Feather.glyphMap ? (name as keyof typeof Feather.glyphMap) : 'help-circle');
  return <Feather name={glyph} size={size} color={color} />;
}
