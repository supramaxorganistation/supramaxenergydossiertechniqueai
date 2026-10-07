/**
 * Design tokens ported from assets/design-tokens.json (Supramax Energy).
 * rem values are converted to px on a 16px base to match the web app.
 */

export const colors = {
  // Brand / primary (blue)
  primary: '#10619C',
  primaryHover: '#0B4A78',
  primaryActive: '#093B60',
  primarySoft: '#E8F1F8',
  primaryForeground: '#FFFFFF',
  ring: '#7FB3D6',

  // Accent (orange)
  accent: '#EE8A17',
  accentDeep: '#9A5B00',
  accentSoft: '#FDF3E7',

  // Status
  success: '#2E8B47',
  successDeep: '#25713A',
  successSoft: '#EAF5EC',
  danger: '#D23430',
  dangerDeep: '#B02A27',
  dangerSoft: '#FBECEB',
  warning: '#EE8A17',
  warningSoft: '#FDF3E7',

  // Surfaces & text
  background: '#F4F6F9',
  surface: '#FFFFFF',
  sunken: '#EDF1F5',
  foreground: '#14212B',
  muted: '#5A6B7B',
  faint: '#93A3B2',
  border: '#DBE3EA',
  borderStrong: '#C3CFDA',
  sidebar: '#0B141B',
  white: '#FFFFFF',

  // Gray scale
  gray: {
    50: '#F4F6F9',
    100: '#EDF1F5',
    200: '#DBE3EA',
    300: '#C3CFDA',
    400: '#93A3B2',
    500: '#5A6B7B',
    600: '#465665',
    700: '#33414E',
    800: '#22303C',
    900: '#14212B',
    950: '#0B141B',
  },
} as const;

/** Semantic badge tones used across the app (mirrors .badge-gray/amber/green/red/blue). */
export const badgeTones = {
  gray: { bg: colors.gray[100], fg: colors.gray[600] },
  blue: { bg: colors.primarySoft, fg: colors.primary },
  green: { bg: colors.successSoft, fg: colors.successDeep },
  amber: { bg: colors.warningSoft, fg: colors.accentDeep },
  red: { bg: colors.dangerSoft, fg: colors.dangerDeep },
} as const;

export const radius = { sm: 6, md: 8, lg: 12, xl: 14, full: 999 } as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const fontSize = {
  micro: 11,
  sm: 13,
  base: 14,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const theme = { colors, radius, spacing, fontSize, badgeTones } as const;
