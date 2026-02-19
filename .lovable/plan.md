

# AURA Institutional-Level Conversation UI Refactor

## Overview

Transform AURA from its current single-column layout into a ChatGPT/Grok-style 2-column architecture in fullscreen, with a clean compact mode for reduced view. Pure UI/layout changes -- no backend, tool, or data flow modifications.

## Current State

- AURA is a single `div` container for both fullscreen and reduced modes
- History panel (`AURAHistoryPanel`) renders as a collapsible section between the header and messages (not a sidebar)
- Fullscreen uses `inset-0 z-[10004]` with `max-w-5xl` for content
- Reduced mode is a right-side panel (`w-full md:w-1/3`)
- Both modes share the same single-column structure

## Architecture Change

### Fullscreen Mode: 2-Column Layout

```text
+----------------------------+--------------------------------------------+
|  Sidebar (fixed, 280px)    |  Conversation Area                         |
|                            |                                            |
|  [+ New Chat]              |  [Header: AURA title + controls]           |
|  ─────────────             |  ──────────────────────────────             |
|  Thread 1 (active)         |                                            |
|  Thread 2                  |     [Messages centered, max-w-[760px]]     |
|  Thread 3                  |     Assistant left / User right             |
|  Thread 4                  |                                            |
|  ...                       |                                            |
|                            |  ──────────────────────────────             |
|  (scrolls independently)   |  [Input bar, centered]                     |
+----------------------------+--------------------------------------------+
```

### Reduced Mode: Clean Single Column

```text
+----------------------------------+
| [Menu] AURA title    [FS] [X]   |
|─────────────────────────────────|
|                                  |
|   Messages (centered, 760px)     |
|                                  |
|─────────────────────────────────|
| [Input bar]                      |
+----------------------------------+
```

Menu icon opens history panel as a slide-over overlay (not inline).

## Detailed Changes

### 1. `src/components/aura/AURAHistoryPanel.tsx` -- Refactor as Sidebar

Transform from a collapsible section into a proper sidebar component that works in two modes:
- **Sidebar mode** (fullscreen): Fixed left column, full height, `w-[280px]`, independent scroll, dark bg (`#0c0f13`), border-right
- **Overlay mode** (reduced): Absolute positioned overlay from left, with backdrop, slides in/out

Content:
- "New Chat" button at top (prominent, full-width)
- Thread list with: title, relative timestamp, active highlight (`bg-white/[0.06]`), hover (`bg-white/[0.04]`)
- Delete with confirmation (existing logic preserved)
- Subtle scrollbar

### 2. `src/components/AURA.tsx` -- Layout Restructure

**Fullscreen container** (line ~1773-1778):
- Change from single-column to `flex flex-row`
- Left: `AURAHistoryPanel` rendered as sidebar (always visible in fullscreen, no toggle needed)
- Right: conversation column (header + messages + input)
- Remove the `showHistory` toggle in fullscreen -- sidebar is always present

**Reduced container**:
- Keep single-column layout
- Replace the inline `showHistory` dropdown with an overlay triggered by a menu/hamburger icon
- History toggle becomes a `PanelLeft` icon instead of `Clock`

**Header simplification** (lines ~1780-1854):
- Fullscreen: lighter header (no history button needed since sidebar is permanent), keep New Chat, Fullscreen toggle, Close
- Reduced: add `PanelLeft` icon for sidebar overlay, keep existing controls
- Thread title displayed subtly under "AURA" name

**Messages area** (line ~1869):
- Enforce `max-w-[760px] mx-auto` in both modes (currently fullscreen uses `max-w-5xl` which is too wide)
- Same padding and spacing in both modes

**Input bar** (lines ~2007-2034):
- `max-w-[760px] mx-auto` in both modes (currently fullscreen uses `max-w-5xl`)

### 3. Spacing and Visual Polish

- Remove excessive padding differences between modes
- Consistent `space-y-4` for message gaps (both modes)
- Message bubbles: keep existing rounded-2xl (user) / rounded-xl (assistant) and colors
- Sidebar thread items: `py-2.5 px-4`, no over-animation, `transition-colors` only
- Widgets in conversation: respect `max-w-[760px]` container -- no horizontal overflow

### 4. Responsive Behavior

- **Desktop fullscreen**: 2-column with sidebar
- **Desktop reduced**: right panel (1/3 width), overlay sidebar on menu click
- **Mobile**: full-width, overlay sidebar on menu click, no 2-column

## Files Modified

1. **`src/components/aura/AURAHistoryPanel.tsx`** -- Restructure to support sidebar mode (full-height, border-right, independent scroll) and overlay mode (absolute, backdrop)
2. **`src/components/AURA.tsx`** -- Restructure fullscreen layout to `flex-row` with sidebar + conversation column; adjust reduced mode to use overlay sidebar; standardize max-widths to 760px

## Files NOT Modified (No Regression)

- `src/hooks/useAuraThread.ts`
- `src/services/auraConversationService.ts`
- `src/lib/auraFeatureRegistry.ts`
- All edge functions
- All other components and pages
- Backend logic, tool calls, MCP, Supabase, streaming

## Technical Notes

- The `showHistory` state in AURA.tsx is repurposed: in fullscreen it controls nothing (sidebar always shown); in reduced mode it controls the overlay visibility
- `AURAHistoryPanel` receives a new `mode` prop: `'sidebar' | 'overlay'` to adjust its container styling
- The overlay mode includes a semi-transparent backdrop (`bg-black/30`) that closes on click
- Sidebar width is `280px` in fullscreen, matching ChatGPT/Claude proportions
- Input and message max-width unified to `760px` for institutional readability

## Acceptance Criteria

- Fullscreen shows permanent sidebar on the left with thread list
- Reduced mode is clean, single column, with overlay sidebar via menu icon
- Conversation area is centered at 760px max-width in both modes
- Same colors, same bubble styles, same proportions
- Widgets respect max-width, no horizontal overflow
- Thread switching, new chat, delete all work in both modes
- No backend, tool, or data flow changes

