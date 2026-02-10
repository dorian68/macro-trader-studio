

# Fix: Dashboard Single-View Layout for Desktop

## Problem

The dashboard currently requires ~3 full page scrolls on a standard laptop (1366x768). The root causes are:

1. **Chart card minimum height**: `min-h-[800px]` on the CandlestickChart Card -- forces the chart to be enormous regardless of content
2. **AssetInfoCard** stacks below as a full-width block
3. **MarketNewsCollapsible** stacks below as another full-width block with no height constraint
4. **Navigation cards** stretch to match the oversized chart height via `flex-1`

## Solution

Restructure the layout density to fit within a single desktop viewport by:

### 1. Remove excessive chart min-height

**File:** `src/components/CandlestickChart.tsx` (line 169)
- **Current**: `min-h-[800px]`
- **Fix**: Remove the min-height entirely. The chart already has a `height={350}` prop and the flex layout handles sizing.

### 2. Reduce chart header padding

**File:** `src/components/CandlestickChart.tsx` (line 172)
- **Current**: `pb-6` on CardHeader, `space-y-4` between header rows
- **Fix**: `pb-3` and `space-y-2` for tighter header

### 3. Compact the 3 navigation cards

**File:** `src/pages/TradingDashboard.tsx` (lines 302, 323, 344)
- **Current**: `p-6`, `gap-4`, icon `p-3`, `h-8 w-8`, title `text-xl`
- **Fix**: `p-4`, `gap-2`, icon `p-2`, `h-6 w-6`, title `text-base` -- more compact while remaining clickable

### 4. Constrain Market Intelligence with internal scroll

**File:** `src/pages/TradingDashboard.tsx` (line 427)
- **Current**: No height limit -- expands to show all news items
- **Fix**: Add `max-h-[320px]` on desktop to cap the section and let ScrollArea handle overflow internally (already present in the component)

### 5. Make AssetInfoCard more compact

**File:** `src/pages/TradingDashboard.tsx` (line 419)
- **Current**: `space-y-4` between AssetInfo and MarketNews, `mt-4`
- **Fix**: `space-y-2`, `mt-2` -- tighter vertical spacing

### 6. Reduce Layout main container spacing

**File:** `src/components/Layout.tsx` (line 290)
- **Current**: `py-4 sm:py-6`
- **Fix**: `py-2 sm:py-3` -- less top/bottom padding on the main content area

### 7. Reduce outer section margins

**File:** `src/pages/TradingDashboard.tsx` (line 261)
- **Current**: `my-2` on the main section
- **Fix**: `my-1` -- tighter

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/CandlestickChart.tsx` | Remove `min-h-[800px]`, compact header padding |
| `src/pages/TradingDashboard.tsx` | Compact nav cards, constrain news height, tighter spacing |
| `src/components/Layout.tsx` | Reduce main content vertical padding |

## Expected Result

- Chart + 3 nav cards visible above the fold on a 13" laptop
- AssetInfo + Market Intelligence visible with minimal scroll
- Market Intelligence uses internal scroll when content overflows
- All components, data, and interactions remain identical
- No mobile regression (changes target `lg:` breakpoint where appropriate)

