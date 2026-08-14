# Brand Guidelines — Supramax Energy

> Last updated: 2026-08-14
> Status: Approved (v1.0)

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #10619C |
| Secondary Color | #14212B |
| Accent Color | #EE8A17 |
| Primary Font | Space Grotesk (display) |
| Body Font | Inter |
| Voice | Précis, calme, expert |

---

## 1. Brand idea

The Supramax Energy mark is four orbital arcs (blue, red, orange, green) in
rotation around a common centre — energy in circulation, held by engineering
discipline. The interface inherits that tension: **calm, neutral, precise
surfaces** (the engineering) carrying **one warm spark of motion** (the energy).

Two recurring visual ideas, used everywhere:

1. **The orbit arc** — a single thin circular arc (quarter to half orbit),
   used sparingly as the only decorative motif: login panel, empty states,
   banner corners. Never as stripes, never repeated as a pattern.
2. **Tinted containment** — surfaces are separated by background tint and
   1px borders, not by shadows or colored edges. Elevation is reserved for
   overlays (menus, modals, toasts).

## 2. Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Grid Blue | #10619C | Primary actions, links, active navigation, focus |
| Grid Blue Dark | #0B4A78 | Hover/pressed states, sidebar surface |
| Grid Blue Light | #E8F1F8 | Selected rows, active tab tint, info surfaces |

### Secondary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Ink Navy | #14212B | Headings, primary text, dark surfaces |
| Steel | #5A6B7B | Secondary text, labels |

### Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| Signal Orange | #EE8A17 | Single sharp accent: key metric, active indicator, warning |
| Signal Orange Deep | #9A5B00 | Text-safe accent/warning text |

### Logo-derived semantic colors

| State | Hex | Usage |
|-------|-----|-------|
| Success (logo green) | #2E8B47 | Conformité OK, confirmations |
| Danger (logo red) | #D23430 | Errors, destructive actions |
| Warning (logo orange) | #9A5B00 / #EE8A17 | Cautions, pending states |

### Neutral Palette

| Name | Hex | Usage |
|------|-----|-------|
| Background | #F4F6F9 | Page background |
| Surface | #FFFFFF | Cards, panels |
| Sunken | #EDF1F5 | Wells, code, insets |
| Border | #DBE3EA | Dividers, card borders |
| Border Strong | #C3CFDA | Input borders, hover borders |

### Accessibility

- Ink on Background: 13.9:1 (AAA). Steel on Surface: 5.4:1 (AA).
- Grid Blue on Surface: 6.3:1 (AA). White on Grid Blue: 6.3:1 (AA).
- Signal Orange is never used for body text (Deep variant only).

## 3. Typography

### Font Stack

```css
--font-display: 'Space Grotesk', 'Inter', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

### Type Scale

| Element | Size | Weight | Line height | Font |
|---------|------|--------|-------------|------|
| Display | 32px | 700 | 1.15 | Space Grotesk |
| H1 | 24px | 700 | 1.2 | Space Grotesk |
| H2 | 18px | 600 | 1.25 | Space Grotesk |
| H3 | 15px | 600 | 1.3 | Space Grotesk |
| Body | 14px | 400 | 1.55 | Inter |
| Small | 13px | 400 | 1.5 | Inter |
| Micro label | 11px | 600 | 1.2 | Inter, uppercase, +0.08em |
| Mono value | 13px | 500 | 1.4 | JetBrains Mono |

## 4. Logo Usage

| Variant | File | Use Case |
|---------|------|----------|
| Stacked full color | public/logo.png | Login, sidebar plate, banners |
| Favicon | public/logo.png | Browser tab, 32px |

- Clear space = ½ the mark height on all sides.
- Minimum stacked width: 96px (sidebar), 140px (login).
- On dark surfaces the logo sits on a white plate (radius 10px); never recolored.
- Don't: rotate, recolor, add shadows, crop the wordmark, place on busy imagery.

## 5. Voice & Tone

| Trait | We are | We are not |
|-------|--------|------------|
| Précis | Chiffré, factuel (« ratio 0,93 — conforme ») | Vague, approximatif |
| Calme | Solution d'abord, jamais d'alarme | Sensationaliste |
| Expert | Vocabulaire STEG/NF C 15-100 assumé | Pédagogue condescendant |

- French UI. Short sentences. Numbers over adjectives.
- Errors state the fix, not the fault: « Ajoutez 1 panneau pour atteindre le ratio minimal de 0,90. »
- No emoji in interface copy or controls. No exclamation marks in system messages.

## 6. Shape & Components

| Element | Radius | Border | Notes |
|---------|--------|--------|-------|
| Button | 8px | none | Primary = Grid Blue; ghost = transparent + Border Strong |
| Input | 8px | 1px Border Strong | Focus: 3px Grid Blue Light ring |
| Card | 12px | 1px Border | White surface, no shadow at rest |
| Modal / menu | 14px | 1px Border | Elevation shadow-2 |
| Pill / badge | 999px | none | Tinted background + Deep text |

Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
Density: data tables tight (8–12px), page headers and login generous (32–64px).

## 7. Icons

- Custom inline SVG set, 24px grid, 1.75px stroke, rounded caps/joins, outline only.
- One icon per action; never emoji as icon.

## 8. AI image style (banners)

Base prompt: "Flat vector composition, cool porcelain background #F4F6F9,
deep grid blue #10619C dominant, single signal-orange #EE8A17 arc motif,
thin orbital arc lines, generous whitespace, no gradients on background,
no text artifacts, engineering-drawing precision."

Don't: purple/pink gradients, 3D blobs, stock-photo solar panels with lens flare.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-14 | Initial guidelines — full product redesign |
