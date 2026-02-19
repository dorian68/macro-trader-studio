

# Fix: Collapsible Sections Collapse on Scroll in AURA Fullscreen

## Problem

When you open a collapsible section (e.g., "Strategy Notes", "Fundamental Analysis") inside an AURA response widget, it collapses back as soon as you scroll. This makes reading the content impossible.

## Root Cause

The response widgets (`AuraFullTradeSetup`, `AuraFullMacro`, `AuraMiniReport`) are defined as **functions inside the AURA component**. Every time the scroll position changes, React updates the `showScrollButton` state, which re-renders the entire AURA component and **recreates** these widget functions. React sees a new function reference as a completely different component type -- it unmounts the old widget and mounts a fresh one, resetting all collapsible sections to their default (closed) state.

```text
User scrolls
  --> scroll event fires
  --> setShowScrollButton() called
  --> AURA re-renders
  --> AuraFullTradeSetup = new function (different reference)
  --> React unmounts old widget, mounts new one
  --> All Collapsible states reset to closed
```

## Solution

Move the three widget components (`AuraFullTradeSetup`, `AuraFullMacro`, `AuraMiniReport`) **outside** the `AURA` component so they are stable references that never change between renders. Pass any needed callbacks (like `navigate`, `onToggle`) as props.

This is a standard React pattern: components must be defined at module scope (or memoized) so their identity is stable across renders.

## Technical Details

### File: `src/components/AURA.tsx`

**Step 1 -- Extract widget components to module scope (before the `AURA` function)**

Move `AuraFullTradeSetup` (currently at line ~515), `AuraFullMacro` (line ~664), and `AuraMiniReport` (line ~850) out of the `AURA` component body and define them as standalone components at the top of the file (after imports/helpers, before `export default function AURA`).

Each component will receive additional props for the callbacks it currently accesses via closure:
- `onNavigate: (path: string) => void` -- replaces `navigate()`
- `onClose: () => void` -- replaces `onToggle()`
- `storeResult: (featureId: string, jobId: string, data: any) => void` -- replaces `storeResultForPage()`

**Step 2 -- Update the render call sites (line ~952)**

Pass the new props when rendering the widgets:

```tsx
{rich.type === 'trade_setup' && (
  <div className="mt-3">
    <AuraFullTradeSetup
      data={rich.data}
      onNavigate={(path) => navigate(path)}
      onClose={onToggle}
    />
  </div>
)}
{rich.type === 'macro_commentary' && (
  <div className="mt-3">
    <AuraFullMacro
      data={rich.data}
      onNavigate={(path) => navigate(path)}
      onClose={onToggle}
    />
  </div>
)}
{rich.type === 'report' && (
  <div className="mt-3">
    <AuraMiniReport
      data={rich.data}
      onNavigate={(path) => navigate(path)}
      onClose={onToggle}
    />
  </div>
)}
```

**Step 3 -- Stabilize callbacks with `useCallback`**

Wrap the navigation/close handlers passed to widgets in `useCallback` to prevent unnecessary re-renders of the extracted components.

### No other files modified

This is a single-file refactor in `AURA.tsx`. No backend, no Supabase, no API changes. The widget appearance and behavior remain identical -- only their React identity becomes stable.

### What this fixes

- Collapsible sections stay open when scrolling
- No more unmount/remount cycle on scroll
- Slight performance improvement (fewer DOM operations per scroll)

### What is NOT touched

- Tool routing, MCP calls, streaming logic
- Supabase queries or realtime subscriptions
- MarketChartWidget rendering
- AURAHistoryPanel or sidebar behavior
- Message parsing, markdown rendering
- Any styling or colors

