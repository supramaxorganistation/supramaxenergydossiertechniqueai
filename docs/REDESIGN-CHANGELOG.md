# Redesign Changelog — Supramax Energy

> Date: 2026-08-14 · Scope: full product redesign (brand → design-system → design → ui-styling → ui-ux-pro-max → banner-design → slides)

## Why

The previous UI was a patchwork of ad-hoc colors, emoji-as-icons, gradients and shadows with no shared system. This pass locks one brand, one token set, one icon language, and re-applies them everywhere so the product reads as a single deliberate design.

## 1 · Brand (skill: brand)

- **New**: `docs/brand-guidelines.md` — single source of truth.
- Palette locked from the Supramax logo: Grid Blue `#10619C` (primary), Ink Navy `#14212B`, Signal Orange `#EE8A17` (single accent), success/danger from the logo's green/red. Neutrals: porcelain `#F4F6F9` bg, white surface, `#DBE3EA` borders.
- Type pairing: **Space Grotesk** (display) + **Inter** (body) + **JetBrains Mono** (values) — loaded in `apps/web/index.html`.
- Logo usage: white plate on dark surfaces, never recolored; `apps/web/public/logo.png` used as favicon, sidebar plate, login hero.
- Two recurring motifs: **orbit arc** (login panel, banners, slides) and **tinted containment** (flat cards + 1px borders; elevation only for overlays).

## 2 · Design system (skill: design-system)

- **New**: `assets/design-tokens.json` → generated `assets/design-tokens.css` (primitive → semantic → component layers).
- `apps/web/src/index.css` now imports the tokens and maps the legacy variable names (`--bg`, `--primary`, `--sidebar-bg`, …) onto semantic tokens, so the whole app recolors from one place.
- No shadows at rest (`--shadow-sm: none`); radii 6/8/12/14; 4/8 spacing rhythm; focus ring = 3px Grid Blue tint.

## 3 · Design (skill: design)

- **Login**: split layout — ink-navy hero with orbit arc + logo plate on the left, calm form card on the right.
- **Shell**: dark sidebar with SVG nav icons, logo plate, user chip with tinted avatar (no gradient).
- **Pages**: dashboard, dossiers, dossier detail, admin, ERP pages (employees, products, stock, sales, quotes, purchases, customers, accounting, settings, profile) all restyled through tokens; data tables tightened, headers generous.

## 4 · UI styling (skill: ui-styling)

- **New**: `apps/web/src/components/Icon.tsx` — one icon language (24px grid, 1.75 stroke, round caps, outline, `currentColor`). ~46 glyphs.
- **Every emoji removed** from UI copy and controls (was ~20 files): stat cards, empty states, tabs, banners, buttons, Face ID modal, chat, back arrows.
- Component states normalized: hover/active/disabled on buttons, tabs, nav, rows; tonal borders via `color-mix()` instead of hardcoded rgba; `prefers-reduced-motion` respected.

## 5 · UX audit (skill: ui-ux-pro-max)

- Hierarchy: typography now carries hierarchy (size/weight/spacing before color); micro-labels uppercase 11px.
- Errors state the fix, not the fault; no exclamation marks; no emoji in system copy.
- Focus-visible ring everywhere; disabled states non-interactive and clear; contrast AA+ (Ink on bg 13.9:1, Grid Blue on white 6.3:1).
- Density varies intentionally: tight tables, generous hero/login.

## 6 · Banners (skill: banner-design)

- **New**: `assets/banners/supramax-hero-1920x600.html` + `.png`, `assets/banners/supramax-social-1080x1080.html` + `.png`.
- Same tokens, fonts, orbit-arc motif and tinted-containment stat strip; one CTA per banner; no gradients, no stock imagery.

## 7 · Slides (skill: slides)

- **New**: `assets/slides/supramax-deck-template.html` (+ `deck-preview.png`) — 6-slide template importing `design-tokens.css`, Chart.js (SRI-pinned), keyboard/click navigation, progress bar, token-only colors, dark cover/CTA slides reusing the orbit arc.

## Anti-slop checklist (verified per screen/banner/slide)

- No purple/blue or pink/orange gradient backgrounds — UI chrome is flat.
- No decorative stripes/edge bars; separation by tint + 1px borders.
- No emoji anywhere in UI; single SVG icon family.
- No default framework fonts; deliberate pairing applied everywhere.
- One dominant color (porcelain/blue family ~65%) + single sharp orange accent.
- No icon-in-a-circle as sole motif; orbit arc + tinted containment instead.
- Left-aligned body text; center only on slide covers/short labels.
- No placeholder copy; French voice: précis, calme, expert.

## Review

Run the app as usual (`npm run dev` at the root) and open the web app; banners and the deck open directly as HTML files in a browser.
