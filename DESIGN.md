# DESIGN.md

## Product

- **Name:** Haloui System
- **Platform:** Local-only Next.js business app for Windows browsers
- **Register:** Product
- **Theme intent:** Light-first. Staff use the app in bright offices and counters during the day, often with paperwork, printers, and customer interactions nearby. The interface should feel paper-adjacent, readable, and calm.

## Visual Direction

- **Color strategy:** Restrained with warm neutrals and one committed amber accent for primary actions and active states.
- **Atmosphere:** Administrative precision with pastry-house warmth. Think cream paper, cocoa ink, brass/amber accents, and fresh green only where semantic success needs it.
- **Avoid:** Flat gray enterprise UI, purple startup gradients, glassmorphism, hard black/white extremes.

## Color System

Use OKLCH-backed warm neutrals and semantic roles. Avoid pure white and pure black.

### Core roles

- `--background`: soft paper surface
- `--background-alt`: warmer panel/sidebar surface
- `--card`: lifted paper
- `--foreground`: cocoa-ink text
- `--muted`: subdued copy and table metadata
- `--border`: warm linework
- `--accent`: saffron/amber primary
- `--accent-foreground`: dark ink on accent
- `--success`: restrained green
- `--warning`: baked orange
- `--danger`: brick red
- `--info`: slate-teal

### Suggested tokens

- Background: warm cream
- Sidebar/panel: toasted beige
- Accent: bakery saffron
- Ink: cocoa brown
- Success: olive-green
- Danger: muted terracotta

## Typography

- **UI font:** `Manrope` or similar clean geometric sans with strong numerals.
- **Arabic print font:** `Noto Naskh Arabic` or similar readable Arabic face for headers and bilingual print footer lines.
- **Hierarchy:** compact product scale, strong label clarity, dense but breathable tables.
- **Body sizing:** 14px minimum in dense UI, 16px default in forms and long text.

## Layout

- Product-shell layout: left sidebar, top utility bar, wide content region.
- Use predictable grids and split panes for operational screens.
- Forms should prefer section blocks with clear captions over deep card nesting.
- Tables should feel ledger-like: crisp borders, alternating subtle row surfaces, pinned totals where useful.
- Reserve spacious, more ceremonial layout treatment for print views only.

## Components

- Buttons: solid accent for primary, warm neutral outline for secondary, ghost for inline actions.
- Inputs: strong labels above fields, visible focus ring, generous numeric alignment for monetary values.
- Status: `brouillon`, `validé`, `imprimé` as consistent chips across all document modules.
- Tables: operational first, with dense rows, inline filters, and summary strips.
- Empty states: explain what the module stores and provide a direct creation action.

## Motion

- Keep motion minimal and state-driven: 150-220ms transitions.
- Use opacity/transform only.
- No theatrical page-load animations.

## Print

- A4 templates must feel official and color-faithful.
- Header should support logo plus bilingual identity.
- Monetary totals and numbering need strong visual emphasis without looking heavy.
- Templates should tolerate real office printers with modest margins and preserve legibility if printed on standard white paper.
