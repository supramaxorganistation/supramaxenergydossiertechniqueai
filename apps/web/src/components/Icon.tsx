/**
 * Supramax Energy — icon set
 * One deliberate icon language: 24px grid, 1.75 stroke, round caps,
 * outline style, inherits currentColor. No emoji anywhere in the UI.
 */
import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  // Navigation
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="10" rx="1.5" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" />
      <rect x="13" y="11" width="8" height="10" rx="1.5" />
      <rect x="3" y="15" width="8" height="6" rx="1.5" />
    </>
  ),
  folder: <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7Z" />,
  inbox: (
    <>
      <path d="M20.5 13.5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17v-3.5" />
      <path d="M3.5 13.5 5.6 6.3a1.5 1.5 0 0 1 1.44-1.05h9.92a1.5 1.5 0 0 1 1.44 1.05l2.1 7.2" />
      <path d="M3.5 13.5h4.7a3.8 3.8 0 0 0 7.6 0h4.7" />
    </>
  ),
  'file-text': (
    <>
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z" />
      <path d="M13.5 3.5v5h5" />
      <path d="M9 12.5h6M9 16h6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="1.5" />
      <path d="M9 4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5v1H9v-1Z" />
      <path d="M9 11h6M9 14.5h6" />
    </>
  ),
  building: (
    <>
      <rect x="4.5" y="3.5" width="11" height="17" rx="1" />
      <path d="M15.5 9.5h3a1 1 0 0 1 1 1v10" />
      <path d="M2.5 20.5h19" />
      <path d="M8 7.5h1.5M11 7.5h1.5M8 11h1.5M11 11h1.5M8 14.5h1.5M11 14.5h1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.75a3.25 3.25 0 0 1 0 5.5M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4v-9Z" />
      <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" />
    </>
  ),
  cart: (
    <>
      <circle cx="9.5" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
      <path d="M3 4h2.2l2.3 11h10.2l1.8-8H6.2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M15.5 14.5h1.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17.5 7H20M4 17h3.5M12 17h8" />
      <circle cx="15" cy="7" r="2.25" />
      <circle cx="9.5" cy="17" r="2.25" />
    </>
  ),
  'plus-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5c2.6 1.3 5.1 2 7 2.2v5.6c0 4.5-2.9 7.5-7 9.2-4.1-1.7-7-4.7-7-9.2V5.7c1.9-.2 4.4-.9 7-2.2Z" />
      <path d="m9.25 12 2 2 3.5-3.5" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h4" />
      <path d="M15.5 8 19.5 12l-4 4M19.5 12H9" />
    </>
  ),
  // Energy / domain
  sun: (
    <>
      <circle cx="12" cy="12" r="3.75" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  zap: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z" />,
  // Status / feedback
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
  'chevron-left': <path d="m14.5 6-6 6 6 6" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.25 12.25 2.5 2.5 5-5.5" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9.25 9.25 5.5 5.5M14.75 9.25l-5.5 5.5" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M12 4 2.75 19.5h18.5L12 4Z" />
      <path d="M12 10v4.25" />
      <circle cx="12" cy="16.75" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="1.5" />
      <path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3" />
    </>
  ),
  banknote: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 12h.01M17.5 12h.01" />
    </>
  ),
  'bar-chart': <path d="M6 20v-8M12 20V5M18 20v-6M3.5 20h17" />,
  'trending-up': (
    <>
      <path d="m3.5 16.5 5.5-5.5 3.5 3.5 7.5-8" />
      <path d="M15.5 6.5H20v4.5" />
    </>
  ),
  'trending-down': (
    <>
      <path d="m3.5 7.5 5.5 5.5 3.5-3.5 7.5 8" />
      <path d="M15.5 17.5H20V13" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 3.5V8h-4.5" />
    </>
  ),
  camera: (
    <>
      <path d="M9 5.5 7.5 8H5A1.5 1.5 0 0 0 3.5 9.5V18a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V9.5A1.5 1.5 0 0 0 19 8h-2.5L15 5.5H9Z" />
      <circle cx="12" cy="13.5" r="3.25" />
    </>
  ),
  // Actions
  search: (
    <>
      <circle cx="11" cy="11" r="6.75" />
      <path d="m20.5 20.5-4.5-4.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.1A9.6 9.6 0 0 1 12 5.75C18 5.75 21.5 12 21.5 12a17 17 0 0 1-2.8 3.3M14.7 14.9a3 3 0 0 1-4.6-3.5" />
      <path d="M6.3 6.8A16 16 0 0 0 2.5 12S6 18.25 12 18.25a9 9 0 0 0 3.5-.7" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4.25" />
      <path d="m11.2 12.3 8.3-8.3M16.5 7l2.5 2.5M13.75 9.75l2 2" />
    </>
  ),
  'face-scan': (
    <>
      <path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16" />
      <path d="M8.75 10v1.25M15.25 10v1.25" />
      <path d="M9.25 15.25a3.6 3.6 0 0 0 5.5 0" />
    </>
  ),
  pen: <path d="m16.7 3.8 3.5 3.5L8 19.5l-4.5 1 1-4.5L16.7 3.8Z" />,
  save: (
    <>
      <path d="M5.5 3.5h10.5l4.5 4.5v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" />
      <path d="M8 3.5V8h7V3.5" />
      <rect x="8" y="13" width="8" height="7" />
    </>
  ),
  paperclip: <path d="m20 11.25-7.8 7.8a5 5 0 0 1-7.07-7.07l8.48-8.49a3.33 3.33 0 0 1 4.71 4.72l-8.13 8.12a1.67 1.67 0 0 1-2.36-2.36l7.43-7.42" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="9.75" r="1.6" />
      <path d="m20.5 15-4.4-4.4a1 1 0 0 0-1.42 0L6 19.3" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </>
  ),
  sparkle: <path d="M12 3.5c.7 3.9 2.6 5.8 6.5 6.5-3.9.7-5.8 2.6-6.5 6.5-.7-3.9-2.6-5.8-6.5-6.5 3.9-.7 5.8-2.6 6.5-6.5ZM18.5 15c.35 1.95 1.05 2.65 3 3-1.95.35-2.65 1.05-3 3-.35-1.95-1.05-2.65-3-3 1.95-.35 2.65-1.05 3-3Z" />,
  bot: (
    <>
      <rect x="4.5" y="8" width="15" height="10.5" rx="2.5" />
      <path d="M12 8V4.75M9.5 4.75h5" />
      <path d="M9 12.5v1.25M15 12.5v1.25" />
      <path d="M9.75 15.9a3.2 3.2 0 0 0 4.5 0" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  className,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[name] || P.inbox}
    </svg>
  );
}
