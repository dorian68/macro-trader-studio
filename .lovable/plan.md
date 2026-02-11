

# Dashboard Column 2 Carousel: Quick Access / Market News

## Overview

Transform the right column of the dashboard into a two-slide carousel that alternates between:
- **Slide 1 (default)**: The 3 navigation cards (AI Trade Setup, Macro Commentary, Reports)
- **Slide 2**: Market Intelligence (news feed, paginated, no scrollbars)

## Architecture

A new component `DashboardColumnCarousel.tsx` wraps both slides using tabs as the switcher (clearer UX than dots for two states). The existing Embla carousel library (already installed) powers the transitions.

## Changes

### 1. New file: `src/components/DashboardColumnCarousel.tsx`

A self-contained component that:
- Uses `Tabs` (Quick Access | Market Intelligence) as the control, styled compactly at the top
- Contains two panels:
  - **Panel 1**: The 3 existing nav cards (AI Trade Setup, Macro Commentary, Reports) in a vertical `flex-col gap-2 flex-1` layout -- identical markup to current column 2
  - **Panel 2**: A paginated news feed (no ScrollArea, no scrollbar). News items are displayed in batches of 3-4 with "Prev / Next" micro-buttons at the bottom. Each news item is a compact card (headline + category badge + time). The panel uses `overflow-hidden` and a fixed item count per page to guarantee zero overflow
- Default tab = "Quick Access" so the 3 cards are visible on arrival
- Smooth fade transition between panels (CSS `animate-fade-in`)
- The whole component is `h-full flex flex-col overflow-hidden` to respect the viewport-fit constraint

### 2. `src/pages/TradingDashboard.tsx`

Replace the desktop column 2 div (lines 295-358) with:

```tsx
<DashboardColumnCarousel className="min-w-0 min-h-0 order-2 my-0 hidden lg:flex h-full" />
```

Remove the `lg:hidden` from `MarketNewsCollapsible` (line 424) since it is no longer needed on desktop -- the carousel handles it. Keep `lg:hidden` on `AssetInfoCard`.

Actually, to avoid duplication, MarketNewsCollapsible stays `lg:hidden` for mobile and the carousel renders its own paginated news view on desktop (different UX: paginated cards vs scrollable list).

No other files change. No routes, API, or business logic affected.

### 3. News pagination logic (inside DashboardColumnCarousel)

- Import `useNewsFeed` hook directly
- Display news in pages of 3 items (compact cards: headline truncated to 2 lines, category badge, timestamp)
- Bottom bar: page indicator (1/N) + Prev/Next buttons
- No scrollbar, no ScrollArea -- pure pagination
- Category filter tabs (All, Forex, Crypto, General) inline at the top of the news panel
- `overflow-hidden` on the container

## Technical details

```
src/components/DashboardColumnCarousel.tsx  (new)
src/pages/TradingDashboard.tsx              (edit lines 295-358)
```

### DashboardColumnCarousel structure

```text
+------------------------------------------+
| [Quick Access]  [Market Intelligence]    |  <-- Tabs switcher
+------------------------------------------+
|                                          |
|  Panel 1 (default):                      |
|  +------------------------------------+  |
|  | AI Trade Setup          ->         |  |
|  +------------------------------------+  |
|  | Macro Commentary        ->         |  |
|  +------------------------------------+  |
|  | Reports                 ->         |  |
|  +------------------------------------+  |
|                                          |
|  -- OR --                                |
|                                          |
|  Panel 2:                                |
|  [All] [Forex] [Crypto] [General]        |
|  +------------------------------------+  |
|  | Headline 1       category   3h ago |  |
|  +------------------------------------+  |
|  | Headline 2       category   1d ago |  |
|  +------------------------------------+  |
|  | Headline 3       category   2d ago |  |
|  +------------------------------------+  |
|           < 1/4 >                        |
+------------------------------------------+
```

### What stays identical

- All 3 nav cards: same markup, same routes, same icons, same translations
- Mobile layout: unchanged (stacked cards + MobileNewsBadge + MobileNewsModal)
- All business logic, WebSocket, API calls, data fetching
- Chart component (column 1): untouched
- No new dependencies (uses existing Radix Tabs + useNewsFeed hook)

### Expected result

- Dashboard loads with Slide 1 (Quick Access) visible by default
- 3 cards immediately accessible, no scroll
- User clicks "Market Intelligence" tab to see paginated news
- Zero scrollbars, zero vertical scroll on desktop
- Smooth tab transitions
- Premium, cohesive aesthetic

