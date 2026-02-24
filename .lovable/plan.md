

## Plan: Clean Up AURA Sidebar (Grok-style Minimal)

### Problem

The collapsed sidebar in AURA's fullscreen mode lists every conversation thread as a `MessageSquare` icon, resulting in a cluttered column of identical icons. In contrast, Grok's sidebar (see reference screenshot) shows only a few functional icons: search, new chat, analytics, documents, and history -- clean and purposeful.

### Changes

**File: `src/components/aura/AURAHistoryPanel.tsx`**

Redesign the **collapsed sidebar** (lines 36-110) to match Grok's minimal approach:

1. **Remove individual thread icons entirely** -- no more per-conversation `MessageSquare` buttons in collapsed mode
2. **Show only functional navigation icons** in this order:
   - Logo icon (AlphaLens) at the top -- acts as brand anchor
   - Search/Browse conversations (opens expanded sidebar via `onToggleCollapse`)
   - New Chat (`Plus` icon)
   - History icon (also triggers `onToggleCollapse` to reveal thread list)
3. **Add a user avatar or indicator at the bottom** (mirroring Grok's bottom avatar)
4. **Add a chevron/expand icon at the very bottom** to expand the sidebar

The expanded sidebar (lines 113-241) stays unchanged -- it already works well with thread titles, timestamps, and delete actions.

### Visual Comparison

```text
BEFORE (collapsed):               AFTER (collapsed, Grok-style):
+--------+                        +--------+
| [menu] |                        | [logo] |
| [+]    |                        |--------|
| [msg]  |                        | [Q]    |  <- Search icon
| [msg]  |                        | [+]    |  <- New Chat
| [msg]  |                        | [doc]  |  <- History/threads
| [msg]  |                        |        |
| [msg]  |                        |        |
| [msg]  |                        |        |
| [msg]  |                        |        |
| [msg]  |                        |--------|
|        |                        | [>>]   |  <- Expand
+--------+                        +--------+
```

### Technical Details

**`src/components/aura/AURAHistoryPanel.tsx`** -- Replace the collapsed mode block (lines 36-110):

- Remove the `threads.map()` that renders per-thread `MessageSquare` icons
- Replace with 3-4 static functional icons: logo at top, search/new-chat/history in middle section, expand chevron at bottom
- Use a `justify-between` flex column to space the top brand area, middle actions, and bottom expand button
- Keep the same color scheme (`bg-[#0a0d10]`, `text-[#6b7280]`, etc.) and sizing (`w-[56px]`, `h-8 w-8` buttons)

The icons used:
- `Search` (from lucide) -- opens the expanded sidebar to browse threads
- `Plus` -- creates a new chat (existing `onNewChat`)
- `Clock` -- opens expanded sidebar to see history (`onToggleCollapse`)
- `PanelLeft` -- expand the sidebar (existing `onToggleCollapse`)

### What Does NOT Change

- Expanded sidebar (thread list with titles, timestamps, delete) -- untouched
- Overlay mode for reduced/side-panel AURA -- untouched
- AURA.tsx main component -- no changes at all
- Welcome screen layout -- no changes
- Conversation view -- no changes
- All hooks, state, and data flow -- untouched

### Files to Modify

| File | Change |
|------|--------|
| `src/components/aura/AURAHistoryPanel.tsx` | Replace collapsed mode thread icons with minimal Grok-style functional icons |

