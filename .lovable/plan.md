

# Remove Extra Summary Text from Macro-Labs Results in AURA

## Problem

When AURA displays a Macro-Labs result, it shows an unwanted text summary above the actual widget:
- "Macro Analysis: EUR/USD"
- "Directional Bias: Bearish (70% confidence)"
- "_See the full analysis below._"

This text is redundant since the full Macro-Labs widget already displays all this information, including the timing badge ("Macro Labs - EUR/USD - 9.3s").

## Change (1 file)

### `src/components/AURA.tsx` (lines 97-113)

Replace the current `macro_lab` summary block that builds a multi-line markdown string with a minimal empty return. The widget already handles all rendering.

**Before:**
```typescript
if (featureType === 'macro_lab') {
  const bias = data?.directional_bias || data?.content?.directional_bias || '';
  const biasConfidence = data?.confidence || data?.content?.confidence;

  let summary = `### Macro Analysis: ${instrument}\n\n`;
  if (bias) {
    summary += `**Directional Bias:** ${bias}`;
    if (biasConfidence) {
      const confVal = Number(biasConfidence);
      summary += ` (${confVal > 1 ? confVal : Math.round(confVal * 100)}% confidence)`;
    }
    summary += '\n\n';
  }
  summary += '_See the full analysis below._\n';
  return summary;
}
```

**After:**
```typescript
if (featureType === 'macro_lab') {
  return '';
}
```

This returns an empty string so no text bubble appears above the widget. The Macro-Labs widget card with the timing badge remains untouched.

## What is NOT Touched

- The widget rendering (timing badge, collapsible panels, charts)
- Trade Generator and Report summary blocks
- AURA history, fullscreen, or routing
- Edge functions
- Markdown parser

