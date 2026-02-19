
# AURA Full Result Rendering — Complete Macro & Trade Content in Chat

## Problem

When AURA receives a macro commentary result, only a 200-character truncated summary + a few tags + "Open Full View" button are shown. The user wants the **full analysis** readable directly in AURA's chat thread — executive summary, fundamental analysis, directional bias, key levels, news citations, economic data — without needing to navigate away.

Additionally, `parseMacroResponse` in the registry **loses sibling structured fields** (market_data, fundamentals, citations_news) when it extracts the text `content` field. And `parseMacroText` regex patterns require colons (e.g., `Executive Summary:`) but the actual payload uses format without colons (e.g., `Executive Summary\n...`).

## Root Causes

1. **`AuraMiniMacro`** (AURA.tsx line 564): Truncates summary to 200 chars, shows only key_drivers tags
2. **`parseMacroText`** (auraFeatureRegistry.ts line 224): Regex expects "Executive Summary:" with colon, but backend sends "Executive Summary\n" without colon
3. **`parseMacroResponse`** (auraFeatureRegistry.ts line 157): When it finds the inner `content` text string, it discards sibling fields (market_data, fundamentals, citations_news)
4. **`extractMarketAttachments`** (AURA.tsx line 183): Checks `Array.isArray(market_data)` but actual data is `{symbol, interval, values: [...]}` — misses the OHLC data
5. **`generateNaturalSummary`** (AURA.tsx line 110): Truncates executive_summary to 500 chars and fundamentals to 300 chars

## Changes

### File 1: `src/lib/auraFeatureRegistry.ts`

#### A. Fix `parseMacroText` (line 224)
Make regex patterns flexible to handle both "Section:" and "Section\n" formats:
- `Executive Summary:?\s*` instead of `Executive Summary:\s*`
- Same for Fundamental Analysis, Directional Bias
- Also extract Key Levels (Support/Resistance numbers) and AI Insights (Toggle GPT / Toggle Curated) sections from text

#### B. Fix `parseMacroResponse` (line 157)
When the inner `content` is a text string, merge the structured sibling fields into the result:
```
// After parsing the text content, merge sibling structured data
const siblings = content as Record<string, unknown>;
if (siblings.market_data) structured.market_data = siblings.market_data;
if (siblings.fundamentals) structured.fundamentals = siblings.fundamentals;
if (siblings.citations_news) structured.citations_news = siblings.citations_news;
if (siblings.base_report) structured.base_report = siblings.base_report;
```

This ensures `widgetData` in AURA.tsx contains all the structured fields needed for full rendering.

### File 2: `src/components/AURA.tsx`

#### A. Fix `extractMarketAttachments` (line 183)
Add handling for `market_data.values` format:
```
// After checking if ohlcSource is array directly
if (ohlcSource && !Array.isArray(ohlcSource) && Array.isArray(ohlcSource.values)) {
  // Handle {symbol, interval, values: [...]} format
  const ohlc = ohlcSource.values.map(...)
  return { type: 'market_chart', payload: { mode: 'candlestick', data: { ohlc }, instrument: ohlcSource.symbol } };
}
```

#### B. Replace `AuraMiniMacro` with `AuraFullMacro` (line 564)
Replace the 200-char truncated card with a comprehensive inline renderer:

- **Executive Summary**: Full text, no truncation
- **Directional Bias + Confidence**: Badge with icon (TrendingUp/TrendingDown) and confidence percentage
- **Key Levels**: Support/Resistance grid with color-coded tags (green/red)
- **Fundamental Analysis**: Bullet list of all points
- **Economic Data Table** (from `fundamentals` array): Compact table with Indicator, Actual, Consensus, Previous columns
- **News Citations** (from `citations_news`): Compact list with publisher badges
- **AI Insights**: Collapsible sections for GPT and Curated insights
- **"Open Full View" button**: Kept at the bottom

All sections are collapsible by default (except Executive Summary and Bias) to avoid overwhelming the chat.

#### C. Enhance `generateNaturalSummary` for macro_lab (line 110)
Remove the 500/300-char truncations. Show full executive summary and fundamental analysis text in the markdown summary.

#### D. Enhance `AuraMiniTradeSetup` similarly (line 526)
Add full strategy notes rendering and decision summary section when available, instead of just the compact Entry/SL/TP grid.

### File 3: No other files changed

## What does NOT change

- Backend endpoints, edge functions
- Tool routing, FEATURE_REGISTRY endpoints/buildPayload
- Toasters (remain as secondary notification)
- Pages trade-generator / macro-labs / reports
- MarketChartWidget component itself
- localStorage persistence
- Credit engagement logic
- Job badge system
- Rich content type structure (RichContent interface)
- Realtime subscription logic
- jobCompletedRef race condition fix

## Technical Details

### AuraFullMacro Component Structure

```text
<div class="border rounded-lg p-4 bg-card/50 space-y-4">
  <!-- Directional Bias Header -->
  <div class="flex items-center gap-2">
    <TrendingUp/Down icon />
    <span>Bullish</span>
    <Badge>70% confidence</Badge>
  </div>

  <!-- Executive Summary (always visible) -->
  <p class="text-sm leading-relaxed">Full executive summary text...</p>

  <!-- Key Levels (always visible) -->
  <div class="grid grid-cols-2 gap-2">
    <div>Support: 4850, 4900</div>
    <div>Resistance: 5045, 5100</div>
  </div>

  <!-- Collapsible: Fundamental Analysis -->
  <Collapsible>
    <CollapsibleTrigger>Fundamental Analysis (6 points)</CollapsibleTrigger>
    <CollapsibleContent>bullet list...</CollapsibleContent>
  </Collapsible>

  <!-- Collapsible: Economic Data -->
  <Collapsible>
    <CollapsibleTrigger>Economic Indicators (10 items)</CollapsibleTrigger>
    <CollapsibleContent>compact table...</CollapsibleContent>
  </Collapsible>

  <!-- Collapsible: News Sources -->
  <Collapsible>
    <CollapsibleTrigger>News Sources (9 articles)</CollapsibleTrigger>
    <CollapsibleContent>list with publisher badges...</CollapsibleContent>
  </Collapsible>

  <!-- Collapsible: AI Insights -->
  <Collapsible>
    <CollapsibleTrigger>AI Insights</CollapsibleTrigger>
    <CollapsibleContent>GPT + Curated sections...</CollapsibleContent>
  </Collapsible>

  <!-- Open Full View button -->
  <Button>Open Full View</Button>
</div>
```

### parseMacroText Enhanced Regex

```text
// Before: /Executive Summary:\s*([^]*?)(?=...)/i
// After:  /Executive Summary:?\s*\n?([^]*?)(?=...)/i

// Also extract key_levels:
// Pattern: Key Levels...\nSupport\n4850\n4900\nResistance\n5045\n5100
// Parse Support/Resistance numbers into structured object

// Also extract AI Insights:
// Pattern: Toggle GPT\n...\n\nToggle Curated\n...
```

### extractMarketAttachments Fix

```text
// After line 183, before Array.isArray check:
if (ohlcSource && typeof ohlcSource === 'object' && !Array.isArray(ohlcSource)) {
  const valuesArray = ohlcSource.values || ohlcSource.data;
  if (Array.isArray(valuesArray) && valuesArray.length > 2 && valuesArray[0]?.open != null) {
    const ohlc = valuesArray.map(d => ({
      time: d.datetime || d.date || d.time,
      open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close),
    })).filter(d => d.time && !isNaN(d.open));
    if (ohlc.length > 2) {
      return { type: 'market_chart', payload: {
        mode: 'candlestick', data: { ohlc },
        instrument: ohlcSource.symbol || root?.instrument,
        timeframe: ohlcSource.interval || root?.timeframe
      }};
    }
  }
}
```
