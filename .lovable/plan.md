

# Fix: Hover Effects Visibility on Trade Generator Page

## Root Cause

The page uses `hover:bg-muted/30` extensively for interactive elements. On the glossy black theme:
- `--muted` = `hsl(0 0% 15%)` = `#262626`
- At 30% opacity on `#0a0a0a` background, this gives ~`#121212` -- virtually invisible

## Elements to Fix

### 1. Collapsible Parameters Card Header (line 2108)
- **Current**: `hover:bg-muted/30`
- **Fix**: `hover:bg-white/[0.06]` for subtle but visible lift

### 2. EnhancedForecastTable rows (line 1301)
- **Current**: `hover:bg-muted/30 transition-colors`
- **Fix**: `hover:bg-white/[0.06] transition-colors cursor-pointer` (rows are clickable to expand Risk Profiles)

### 3. TradeSetupCard (line 928)
- **Current**: `rounded-xl border shadow-sm` (no hover at all)
- **Fix**: Add `transition-colors hover:border-white/20` for subtle card hover feedback

### 4. Ghost Buttons (Collapsible triggers) throughout the page
- Ghost variant already has `hover:bg-accent` (orange) which should be visible
- No change needed for these

### 5. Risk Profiles Table rows (around line 1301 in the RiskProfilesPanel)
- **Current**: `hover:bg-muted/30`
- **Fix**: `hover:bg-white/[0.06]`

### 6. Debug section Collapsible triggers
- Using ghost buttons -- already handled by button variant
- No change needed

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/ForecastTradeGenerator.tsx` | Fix hover on ~4-5 elements |

## Approach

Replace `hover:bg-muted/30` with `hover:bg-white/[0.06]` which provides visible contrast on the dark theme while remaining subtle and professional. Add `cursor-pointer` where clickable rows lack it.

## No Regression

- No logic changes
- No layout changes
- Only CSS hover class replacements
- All existing functionality preserved

