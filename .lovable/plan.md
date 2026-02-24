

## Plan: AURA Welcome Screen (Grok-style)

### Overview

Transform the AURA empty state into a centered "welcome screen" inspired by Grok's design: branding + logo centered vertically, the input bar in the middle of the screen, and pre-filled suggestion chips below it. Once a conversation begins (or when loading an existing thread), the UI reverts to the current layout with the input bar at the bottom.

### What Changes

**1. New "Welcome Screen" state (when `messages.length === 0`)**

Instead of the current layout (header + empty scroll area + bottom input), when there are no messages:

- **Remove the full header bar** -- replace with a minimal/compact version
- **Center vertically**: AlphaLens logo + "AURA" branding text
- **Below branding**: The same input bar (Search icon + AURA v2 badge + text input + send button), centered
- **Below input**: 4 suggestion chips as pill buttons (e.g., "Trade setup on EUR/USD", "Macro outlook on Gold", "Technical analysis BTC", "Generate a report")
- No scroll area, no bottom-pinned input -- everything is centered

**2. Reduced mode (side panel) -- Welcome state:**

- The header shrinks to show only the logo icon (no "AURA" text, no subtitle) -- just the round logo + action buttons (fullscreen, close)
- Input + suggestions centered in the available space

**3. Fullscreen mode -- Welcome state:**

- The sidebar remains as-is (collapsed by default with just icons)
- The main area shows the centered welcome screen (large logo + AURA text + input + suggestions)

**4. Active conversation state (when `messages.length > 0`):**

- Everything stays exactly as it is today -- no changes to the conversation UI

### Suggestion Chips (pre-filled queries)

```text
"Trade setup on EUR/USD"
"Macro outlook on Gold" 
"Show me technical indicators on BTC 15min"
"Generate a market report"
```

Clicking a chip sends the message immediately (same as current quick actions).

### Technical Implementation

**File: `src/components/AURA.tsx`**

The `conversationColumn` variable (line 1785) currently always renders: Header + ScrollArea (with empty state inside) + bottom Input.

Change to:

```
const hasMessages = messages.length > 0;

if (!hasMessages) {
  // Render WELCOME SCREEN layout
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[#0F172A]">
      {/* Compact header (logo-only in reduced, minimal in fullscreen) */}
      <div className="shrink-0 flex items-center justify-end px-3 py-2 gap-0.5">
        {/* Only action buttons: fullscreen, close -- no branding here */}
      </div>

      {/* Centered welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {/* Logo + AURA text */}
        <div className="flex flex-col items-center gap-3">
          <img src="/lovable-uploads/56d2c4af-..." className="w-16 h-16 rounded-xl shadow-lg" />
          <h1 className="text-2xl font-semibold text-white/90">AURA</h1>
          <p className="text-sm text-[#6b7280]">Your AI Research Assistant</p>
        </div>

        {/* Centered input bar */}
        <form onSubmit={handleSubmit} className="w-full max-w-[600px]">
          {/* Same input bar as current bottom bar */}
        </form>

        {/* Suggestion chips */}
        <div className="flex flex-wrap justify-center gap-2 max-w-[600px]">
          {suggestions.map(s => <button onClick={() => sendMessage(s.text)}>...</button>)}
        </div>
      </div>
    </div>
  );
}

// Otherwise render current conversationColumn (header + messages + bottom input)
```

**Key architectural decisions:**

- The welcome screen is rendered INSTEAD of the conversation column, not inside ScrollArea -- this avoids any scroll issues
- The `conversationColumn` variable becomes a conditional: welcome screen OR conversation view
- The header buttons (history, fullscreen, close) still appear in the welcome screen but in a minimal top-right bar
- In reduced mode (side panel), the welcome header only shows the small logo icon + buttons (no text)
- The existing `QUICK_ACTIONS` object stays but is supplemented by 4 new "welcome suggestions" that are more user-friendly

### What Does NOT Change

- Message rendering logic (all widget components stay at module scope)
- Conversation flow once messages exist
- AURAHistoryPanel component
- Fullscreen sidebar behavior
- All hooks, state management, job handling
- The collapsed (FAB) state when AURA is not expanded
- The teaser bubble system

### Files to Modify

| File | Change |
|------|--------|
| `src/components/AURA.tsx` | Add welcome screen conditional in `conversationColumn`, add welcome suggestion constants |

### Visual Layout

```text
WELCOME STATE (centered):
+------------------------------------------+
|                        [fs] [x]          |
|                                          |
|                                          |
|              [Logo Icon]                 |
|                AURA                      |
|         AI Research Assistant            |
|                                          |
|    [Search icon | Ask AURA... | Send]    |
|                                          |
|  [Trade EUR/USD] [Macro Gold] [BTC 15m]  |
|          [Generate Report]               |
|                                          |
+------------------------------------------+

CONVERSATION STATE (current, unchanged):
+------------------------------------------+
| [logo] AURA - thread title  [+] [fs] [x]|
|------------------------------------------|
| messages...                              |
|                                          |
|------------------------------------------|
| [Search | AURA v2 | input...     ] [>]   |
+------------------------------------------+
```

