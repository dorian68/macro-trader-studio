

# AURA MCP: Enriched Tool Result Messages in Chat

## Current State

Tool results are **already posted as chat messages** with mini-widgets (Trade Card, Macro Card) and "Open Full View" buttons. The core flow works.

## What's Missing

1. **No "View raw JSON" collapsible** on tool result messages
2. **No elapsed time / metadata** shown on results
3. **Error results** show text but no raw error JSON for debugging
4. **Human summary** text could be richer (instrument + direction + confidence in one line)

## Changes

### 1. Extend the `Message` interface to carry raw data

Add an optional `rawJson` field and `meta` to the rich content type so the renderer can show a collapsible JSON block without changing the message shape.

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string | {
    type: string;
    data: any;
    summary: string;
    rawJson?: string;      // NEW: stringified raw response
    meta?: {               // NEW: timing + feature info
      featureId: string;
      instrument: string;
      elapsedMs?: number;
    };
  };
  attachments?: Array<{ type: 'market_chart'; payload: any }>;
}
```

### 2. Populate `rawJson` and `meta` on job completion (lines 890-912)

When building the `richContent` object after a successful job, add:
- `rawJson`: `JSON.stringify(parsedPayload, null, 2)` (truncated to 100KB max)
- `meta`: `{ featureId: featureType, instrument }`

### 3. Populate `rawJson` on job error (lines 934-951)

When a job fails, post a rich error message instead of plain text:
- `type: 'tool_error'`
- `summary`: the existing error text
- `rawJson`: stringified error payload if available
- `meta`: feature + instrument info

### 4. Add "View raw JSON" collapsible to `renderMessageContent`

Inside the rich content branch (lines 446-454), after the mini-widget, render a collapsible section:

```
[Collapsible trigger: "View raw JSON" with chevron]
  [CollapsibleContent: <pre> block with monospace JSON, max-height 300px, overflow scroll]
```

Uses the existing `@radix-ui/react-collapsible` already installed and exported from `src/components/ui/collapsible.tsx`.

For large JSON (over 50KB), show "Raw JSON is large -- click to expand" with lazy rendering.

### 5. Add metadata line to rich messages

Below the summary text, show a subtle line:
```
Trade Generator | EUR/USD | completed in 12s
```
Using `text-xs text-muted-foreground` styling.

## Files Modified

| File | Change |
|------|--------|
| `src/components/AURA.tsx` | Extend Message interface, add rawJson/meta to rich content on completion/error, add Collapsible JSON viewer + metadata line in renderMessageContent |

## No Regression Guarantees

- Mini-widgets (Trade Card, Macro Card, Report Card) remain unchanged
- "Open Full View" buttons remain unchanged
- Message layout (left/right alignment, max-width, rounded) unchanged
- Job badge system unchanged
- Realtime subscription logic unchanged
- Registry, endpoints, payload builders unchanged
- localStorage conversation persistence unchanged (rawJson is included but capped)

