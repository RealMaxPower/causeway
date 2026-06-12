# Causeway brand

A v1 identity for the project — single mark, two assets, one palette. Use this
folder when you need to drop the logo into a slide, README badge, press kit, or
anywhere outside the app. The in-app surfaces (favicon, topbar, OG cards) are
generated from `app/icon.svg`, `app/opengraph-image.tsx`, and
`components/chrome/Logo.tsx` — keep those as the source of truth and treat the
files here as exported snapshots.

## The mark

Three pillars holding a horizontal roadway. Three readings, one shape:

1. **A causeway** — a raised path across water. Matches the product's
   "navigable path through complexity" promise.
2. **A bar chart with a reference line** — fits the instrument-panel side of
   the design system.
3. **The three-layer pedagogy** — pocket / working model / full picture. Three
   pillars, not two or four.

## Files

| File | When to use |
|---|---|
| [mark.svg](mark.svg) | Square mark on its own — favicons, app icons, slide corners, social avatars |
| [wordmark.svg](wordmark.svg) | Horizontal lockup — README headers, press, document covers |

For in-app use, import `<Logo />` from `components/chrome/Logo.tsx` — it
inherits `currentColor` and is the only path that automatically respects the
in-app theme toggle.

## Palette

Pulled from [styles/tokens.css](../../styles/tokens.css). Use the CSS tokens
inside the app; the hex values here are for places that can't reference CSS.

| Role | Token | Light hex | Dark hex |
|---|---|---|---|
| Mark | `--gold-deep` | `#9f6736` | `#d0944b` |
| Page | `--paper` | `#f5efe1` | `#262320` |
| Type | `--ink` | `#393530` | `#ecead8` |
| Waterline | `--ink-3` @ 30% | `#7e7872` | `#a09b94` |

## Clear space and sizing

- **Clear space:** at least one pillar-width of empty space on every side of
  the mark. Don't crowd it with type or borders.
- **Minimum size:** 16×16 px (favicon). Below that, the pillars collapse and
  the mark stops reading as three.
- **Background:** prefer `--paper` (cream) or `--ink` (deep). On photographic
  backgrounds, wrap the mark in a paper-cream tile with rounded corners
  (matches the apple-icon treatment).

## Don't

- Don't recolor the pillars. The mark is monochrome — gold on light, gold on
  dark. No rainbow, no gradients, no per-pillar tint.
- Don't add an outline or stroke. The fill is the form.
- Don't stretch. Always preserve the 1:1 aspect ratio.
- Don't slope the roadway. It is a level beam by definition — sloping it
  breaks both the causeway and bar-chart readings.
- Don't add a fourth pillar. Three is the whole point.
