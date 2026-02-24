

## Institutional Feature Cards Redesign

### Overview
Replace the 3 generic SaaS-style feature cards (circular icon containers + centered text) with institutional-grade, trading-desk-inspired cards featuring custom SVG mini-visuals, uppercase badge labels, and subtle CTA links.

### Files to Create

**1. `src/components/homepage/SignalsEngineVisual.tsx`**
- Compact SVG component (~80px tall) rendering an abstract mini candlestick/trend chart
- Thin neutral strokes with one orange-accented line/marker
- Subtle risk/reward band zone effect
- No external dependencies -- pure inline SVG

**2. `src/components/homepage/MacroDeskVisual.tsx`**
- SVG component rendering a timeline strip with 4-5 vertical impact bars of varying heights
- One bar highlighted in orange accent to represent a key macro event
- Small dot markers along a baseline

**3. `src/components/homepage/ResearchLabVisual.tsx`**
- SVG component rendering an abstract report preview
- Horizontal lines simulating text rows, small bar chart blocks at the bottom
- Flat and minimal, no document-icon feel

### Files to Modify

**4. `src/pages/Homepage.tsx`** -- Feature cards section only (lines 82-120)

Replace the 3 `<Card>` blocks with the new institutional card structure:

```text
CURRENT CARD STRUCTURE:
  [Circular icon container]
  [Centered title]
  [Centered description]

NEW CARD STRUCTURE:
  [Uppercase badge: "SIGNALS ENGINE"]
  [SVG mini visual block]
  [Left-aligned title: "AI Trade Setups"]
  [Left-aligned description (2 lines max)]
  [CTA link: "Open module -->"]
```

Card styling changes:
- Remove `text-center` alignment -- use left-aligned text
- Remove circular icon containers entirely
- Add refined border styling: `border-border/60` with `hover:border-accent/40`
- Card background stays dark (`bg-card`)
- Badge: small uppercase text, `text-[10px] tracking-[0.15em]`, subtle border, muted color, with a tiny colored dot
- Description: `line-clamp-2` to enforce 2-line max
- CTA: `text-accent` link with arrow, subtle hover underline
- Hover: `hover:-translate-y-0.5` for minimal lift
- Cards wrapped in `flex flex-col h-full` for equal heights, CTA pushed to bottom with `mt-auto`

Remove unused Lucide imports (`Brain`, `BarChart3`, `FileText`, `TrendingUp`, `Target`) since we no longer use any icons in this section.

### Hardcoded Content (not i18n)

Per the user's exact spec, the card text is hardcoded English:

| Card | Badge | Title | Description | CTA | Route |
|------|-------|-------|-------------|-----|-------|
| 1 | SIGNALS ENGINE | AI Trade Setups | Regime-aware setups with entry, TP/SL, and sizing across FX & crypto. | Open module | /dashboard |
| 2 | MACRO DESK | Macro Commentary | Event-driven commentary with market impact mapping and actionable bias. | Open module | /macro-analysis |
| 3 | RESEARCH LAB | Research Reports | Institutional-style reports combining quant outputs and macro context. | Open module | /reports |

### Design Tokens Used
- `--accent` (orange `hsl(17 88% 58%)`) for highlights and CTA text
- `--card` (dark `hsl(0 0% 5%)`) for card backgrounds
- `--border` (subtle `hsl(0 0% 20%)`) for card borders
- `--muted-foreground` for descriptions and badge text
- `--foreground` (white) for titles

### What Is NOT Touched
- Hero section, navbar, CTA section, footer -- all untouched
- Global styles, routing, auth logic -- all untouched
- Section title ("Professional Trading Intelligence") and subtitle -- preserved
- No new dependencies added
- Responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) -- preserved

### Technical Notes
- SVG visuals are lightweight inline components (no chart libraries)
- Each visual component is reusable and can be imported in dashboard or feature pages later
- The `ArrowRight` Lucide import is kept (used in hero section)
- Cards remain clickable via the CTA link using `navigate()`, not wrapping the whole card

