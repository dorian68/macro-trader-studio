
# AURA Tool Result Pipeline Fix — Eliminate Race Condition

## Root Cause

The tool result rendering pipeline (rich content, mini-widgets, charts) is **already implemented** in lines 1100-1158 of `AURA.tsx`. The problem is a **race condition**:

1. Line 1034: Adds "Launching request..." message
2. Line 1081-1223: Subscribes to realtime job updates (correctly builds rich content on completion)
3. Line 1248: Sends HTTP request
4. **Line 1264-1267: ALWAYS replaces the last message with a static "Requete lancee" string**

If the realtime update fires **before** the HTTP resolves (common with fast backends), the rich result message gets **overwritten** by the static confirmation at line 1264. The user only sees "Requete lancee" and never sees the actual result.

## Solution

### File: `src/components/AURA.tsx`

#### 1. Add a completion tracking ref (near line 294)

Add a `jobCompletedRef` to track whether the realtime handler has already injected a result:

```
const jobCompletedRef = useRef<Set<string>>(new Set());
```

#### 2. Mark job as completed in the realtime handler (line ~1155)

Before injecting the rich content message, add the jobId to the completed set:

```
jobCompletedRef.current.add(jobId);
```

Same for error handling (line ~1212).

#### 3. Guard the static message at line 1264-1267

Replace the unconditional "Requete lancee" message with a guard:

```
// Only show "request launched" if realtime hasn't already injected the result
if (!jobCompletedRef.current.has(jobId)) {
  setMessages((prev) => [
    ...prev.slice(0, -1),
    { role: 'assistant', content: `... Requete lancee pour ${instrument}. En attente du resultat...` },
  ]);
}
```

This ensures:
- If realtime fires first: rich content stays, static message is skipped
- If HTTP resolves first: user sees "waiting" message, then realtime replaces it with rich content
- Concurrent jobs: each tracked by unique jobId in the Set

#### 4. Clean up the ref on completion (optional)

After injecting the result, remove the jobId from the Set after a delay to prevent memory leak:

```
setTimeout(() => jobCompletedRef.current.delete(jobId), 5000);
```

## What does NOT change

- Tool routing, FEATURE_REGISTRY, resolveFeatureId
- Backend endpoints, edge functions
- Existing toasters (they remain as secondary notification)
- Pages trade-generator / macro-labs / reports
- Mini-widget components (AuraMiniTradeSetup, AuraMiniMacro, AuraMiniReport)
- MarketChartWidget rendering
- generateNaturalSummary function
- extractMarketAttachments function
- Rich content structure (RichContent interface)
- localStorage persistence
- Credit engagement logic
- Job badge system

## What already works (no changes needed)

- Rich content rendering with summary + widgets + charts (lines 1116-1158)
- Natural language summary generation (lines 53-161)
- Mini-widget display: Trade Card, Macro Card, Report Card (lines 524-607)
- MarketChartWidget inline in chat (lines 642-655)
- "Open Full View" buttons on each widget (already implemented)
- Chart attachment extraction from payloads (lines 174-251)
- Collapsible raw JSON viewer (lines 668-694)
- Error handling with rich error content (lines 1179-1219)

## Summary

This is a **3-line fix** to a race condition. The entire tool result pipeline (rich rendering, widgets, charts, "Open in Page" buttons) is already built and functional -- it was just being overwritten by a static confirmation message.
