---
kind: frontend_style
name: CSS-Only Design System with CSS Variables and Utility Classes (Web App)
category: frontend_style
scope:
    - '**'
source_files:
    - apps/web/src/index.css
    - apps/web/src/App.css
    - apps/web/src/components/ui.tsx
    - apps/web/package.json
    - apps/mobile/App.tsx
---

## Overview

The repository contains two frontends with distinct styling approaches:

### Web App (`apps/web/`)
The web application uses a **plain CSS design system** built on top of Vite + React. There is no CSS-in-JS library, no Tailwind, no component UI kit — styling is entirely hand-authored CSS files.

### Mobile App (`apps/mobile/`)
The mobile app is a minimal Expo/React Native prototype that styles components inline via `StyleSheet.create` in `App.tsx`. It has no shared style system beyond basic layout primitives.

---

## Web App Styling Architecture

### Design Tokens (single source of truth)
All visual tokens live in `src/index.css` under the `:root` pseudo-class as CSS custom properties:

- **Colors**: `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--text-faint`
- **Semantic palette**: `--primary` / `--primary-hover` / `--primary-soft`, `--success` / `--success-soft`, `--warning` / `--warning-soft`, `--danger` / `--danger-soft`, `--info` / `--info-soft`, `--sun`
- **Sidebar theme**: `--sidebar-bg`, `--sidebar-text`, `--sidebar-active`
- **Spacing & shape**: `--radius` (12px), `--radius-sm` (8px)
- **Shadows**: `--shadow-sm`, `--shadow`, `--shadow-lg`
- **Typography**: `--sans` (Inter/system stack), `--mono`
- **Global mode**: `color-scheme: light` (dark mode not implemented)

### Global Reset & Base Styles
`index.css` also provides a universal reset (`* { margin:0; padding:0; box-sizing:border-box }`) and base typography for `html`, `body`, and links.

### Component Library (`src/App.css`)
A single large stylesheet defines reusable class-based components:

| Category | Classes | Purpose |
|---|---|---|
| Layout | `.app`, `.sidebar`, `.main`, `.topbar`, `.content` | Dashboard shell with fixed sidebar |
| Cards | `.card`, `.stat-card` | Data containers with consistent borders/shadows |
| Buttons | `.btn`, `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-warning`, `.btn-ghost`, `.btn-sm`, `.btn-block`, `.icon-btn` | Unified button variants |
| Badges | `.badge`, `.badge-gray/amber/green/red/blue`, `.badge-dot` | Status indicators |
| Forms | `.form-group`, `.form-label`, `.input`, `.select`, `.textarea`, `.file-drop` | Form fields with focus states |
| Tables | `.table-wrap`, `table.data` | Styled data tables |
| KV lists | `.kv`, `.kv-item` | Key-value display pairs |
| Compliance banners | `.compliance-banner.ok/warn/error`, `.check-list`, `.cl-ok/cl-bad/cl-warn` | STEG compliance status display |
| Messages | `.msg-box.error/warn/info` | Alert boxes |
| Tabs | `.tabs`, `.tab.active` | Tab navigation |
| Utilities | `.grid`, `.grid-2/3/4`, `.flex`, `.gap-*`, `.mt-*`, `.mb-*` | Layout helpers |
| Feedback | `.spinner`, `.loading-screen`, `.empty-state` | Loading and empty states |
| Login page | `.login-page`, `.login-hero`, `.login-panel`, `.login-card` | Dedicated login screen |

### Component Composition Pattern
Components in `src/components/ui.tsx` are thin React wrappers that compose these CSS classes. For example:
- `StatusBadge` maps a typed `DossierStatus` to a className like `badge badge-green`
- `StatCard` composes `stat-card` + `stat-icon stat-blue` etc.
- Components accept variant props (`color`, `status`) that resolve to predefined class names rather than inline styles.

### Responsive Strategy
Responsive behavior is handled via `@media` queries at the end of `App.css`:
- `max-width: 1024px`: grid columns collapse from 4 → 2, then 3 → 2
- `max-width: 768px`: sidebar collapses to icon-only (72px width), text labels hidden, grids go single-column, content padding reduced

No mobile-first breakpoints or fluid typography — this is a desktop-first dashboard with breakpoint overrides.

### Typography & Icons
- Font family is set globally via `--sans` variable referencing Inter/system fonts
- Icons are rendered as emoji characters directly in JSX (e.g., `'🔍'`, `'✅'`, `'❌'`, `'⚠️'`, `'📭'`) — no icon font or SVG sprite system

### Build & Tooling
- Built with **Vite** (`vite.config.ts`, scripts in `package.json`)
- Linting via **oxlint** (`oxlintrc.json`)
- No CSS preprocessing (no Sass/Less/PostCSS plugins configured)
- No CSS modules, no CSS-in-JS, no utility framework

## Mobile App Styling

The mobile app (`apps/mobile/App.tsx`) uses React Native's `StyleSheet.create` with hardcoded numeric values (margins, paddings, colors). There is no shared design token system — styles are defined inline per screen. This is a proof-of-concept prototype, not a production style system.

## Conventions Observed

1. **All colors flow through CSS variables** — hard-coded color literals appear only in gradients and fallbacks within `App.css`; semantic usage goes through `var(--*)`.
2. **Class naming follows BEM-like flat structure** — simple lowercase dot-separated class names (`.btn-primary`, `.stat-card`, `.compliance-banner.ok`).
3. **Variant composition via class concatenation** — base class plus modifier class (e.g., `badge badge-green`, `stat-card stat-blue`).
4. **Dark mode is not implemented** — `color-scheme: light` is the only scheme; no `prefers-color-scheme` media query.
5. **No responsive design system** — breakpoints are ad-hoc overrides in one `@media` block rather than a token-driven responsive scale.
6. **Components are presentational wrappers** around CSS classes, not self-contained styled units.