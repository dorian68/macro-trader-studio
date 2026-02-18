

# Add Decision Summary Card (SuperUser only)

## Overview

Display a new card showing the `decision_summary` field from the API response. This card is only visible to SuperUser accounts and is placed after the existing Decision Layer (Step 3). No existing components are modified.

## Data Extraction

A new `extractDecisionSummary(raw)` function follows the same 3-path extraction pattern used by `extractFinalAnswer`, `extractConfidenceNote`, etc:
- Path 1: `body.message.message.content.content.decision_summary`
- Path 2: `output.trade_generation_output.decision_summary`
- Path 3: `trade_generation_output.decision_summary`

Handles JSON-string and object formats via the existing `parseContentContent` helper.

## New State

```
const [decisionSummary, setDecisionSummary] = useState<Record<string, unknown> | null>(null);
```

Set alongside other extractions in both `handleSubmit` and the `pendingResult` injection block. Reset to `null` on new submission.

## New Component: `DecisionSummaryCard`

Renders only when `isSuperUser && decisionSummary` is truthy. Placed right after `<DecisionLayer />` in the JSX.

Visual structure:
- Header with "Decision Summary" title + SuperUser badge + alignment/verdict/confidence badges
- **Trade Card** section: direction badge, timeframe, horizon, Entry/SL/TP/R:R grid (reuses existing styling patterns), invalidation note
- **Narrative** section: full text paragraph
- **Key Risks** section: numbered list with warning icons
- **Next Step** section: highlighted action box
- **Disclaimer** at the bottom in italic

Styling follows the existing card patterns (Card/CardHeader/CardContent, Badge, grid layouts, color coding for long/short).

## Changes Summary

| Location | Change |
|----------|--------|
| `extractDecisionSummary()` (new function, ~40 lines) | Multi-path extraction following existing pattern |
| State declaration (~line 1771) | Add `decisionSummary` state |
| `handleSubmit` (~line 2040) | Extract and set `decisionSummary` |
| `handleSubmit` reset (~line 1871) | Reset `decisionSummary` to null |
| Pending result injection (~line 1836) | Extract and set `decisionSummary` |
| `DecisionSummaryCard` (new component, ~120 lines) | Visual card rendering |
| JSX after DecisionLayer (~line 2541) | Render `DecisionSummaryCard` conditionally |

## What does not change

- DecisionLayer component: untouched
- All existing extractors: untouched
- API payload: no change
- Other pages: no impact
- Non-superuser experience: identical (card is hidden)

