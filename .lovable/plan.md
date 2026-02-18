

# AURA Upgrade — "Jarvis du Trading"

## Audit Results

### What Works Well
- Tool calling architecture (Lovable AI + edge function) correctly detects intent and routes to `launch_ai_trade_setup`, `launch_macro_commentary`, `launch_report`
- Realtime job tracking via Supabase channels with badge status updates
- Collective intelligence integration (community data, ABCG research)
- Technical analysis with batch mode (price + indicators)
- Language detection and conversation history (last 7 messages)

### Frictions Identified

1. **Results leave AURA**: When a job completes, user must click a badge that navigates away (`/ai-setup`, `/macro-analysis`, `/reports`). AURA loses context.
2. **No mini-widgets**: Completed results show a generic text message ("Analysis complete, navigate to...") instead of a compact result card inside the chat.
3. **No fullscreen mode**: AURA is locked to a 1/3 side panel with no expand option.
4. **No contextual memory**: AURA doesn't remember last instrument/timeframe between messages. "Now run it on gold" would fail.
5. **Plain text messages**: Assistant messages use `whitespace-pre-wrap` text — no markdown rendering (bold, lists, code blocks are shown as raw text).
6. **Tool schema mismatch**: `launch_macro_commentary` tool only has a `focus` param but the `handleToolLaunch` function reads `parsedArgs.instrument`. If the AI puts the instrument in `focus`, it's lost.
7. **No multi-command chaining**: "Run macro then trade setup" would only trigger one tool call.

---

## Implementation Plan

### Phase 1: Contextual Memory

**File: `src/components/AURA.tsx`**

Add a `useRef` for session memory:
```
const sessionMemory = useRef<{
  lastInstrument?: string;
  lastTimeframe?: string;
  lastFeature?: string;
}>({});
```

Update `handleToolLaunch` to save context after each tool execution:
- After extracting `instrument`/`timeframe`/`functionName`, store them in `sessionMemory.current`

Update `sendMessage` to inject memory into the edge function call:
- Add `sessionMemory: sessionMemory.current` to the request body

**File: `supabase/functions/aura/index.ts`**

Read `sessionMemory` from request body and inject into system prompt:
```
CONTEXTUAL MEMORY:
- Last instrument: ${sessionMemory?.lastInstrument || 'none'}
- Last timeframe: ${sessionMemory?.lastTimeframe || 'none'}
- Last feature: ${sessionMemory?.lastFeature || 'none'}
When user says "run it again", "same for gold", "now on H1" — use this memory to fill missing parameters.
```

### Phase 2: Fix Tool Schema for Macro Commentary

**File: `supabase/functions/aura/index.ts`**

Update the `launch_macro_commentary` tool definition to include `instrument` and `timeframe`:
```
parameters: {
  type: "object",
  properties: {
    instrument: { type: "string", description: "Market instrument (e.g., EUR/USD, Gold, BTC)" },
    timeframe: { type: "string", description: "Analysis timeframe (default: D1)" },
    focus: { type: "string", description: "Market sector focus" },
    customNotes: { type: "string", description: "Additional context" }
  },
  required: ["instrument"]
}
```

Same for `launch_ai_trade_setup` — add `riskLevel`, `strategy`, `positionSize`, `customNotes` to schema so the AI can pass them.

Same for `launch_report` — add `instrument` (single string) alongside `instruments` (array).

### Phase 3: Markdown Rendering in Chat

**File: `src/components/AURA.tsx`**

Install and use a lightweight markdown renderer for assistant messages. Since the project doesn't have `react-markdown`, use a simple approach:

Create a helper `renderMarkdown(text: string)` that converts:
- `**bold**` to `<strong>`
- `\n` to line breaks
- `- item` to list items
- `### Header` to styled headers
- Emoji preserved as-is

Replace the plain text rendering (line 1080):
```
// Before
<p className="text-sm whitespace-pre-wrap">{msg.content}</p>

// After
<div className="text-sm prose prose-sm dark:prose-invert max-w-none">
  {renderMarkdown(msg.content)}
</div>
```

### Phase 4: Mini-Widgets for Completed Results

**File: `src/components/AURA.tsx`**

When a job completes (line 761-793), instead of just showing "Analysis completed", parse the `response_payload` and render a mini-widget inline in the chat.

Create 3 mini-widget components inside AURA:

**`AuraMiniTradeSetup`**: Compact card showing:
- Instrument + Direction badge (Long/Short)
- Entry / SL / TP1 in a row
- Risk:Reward + Confidence
- "Open Full View" button (navigates to /ai-setup)

**`AuraMiniMacro`**: Compact card showing:
- First 200 chars of executive summary (truncated)
- Key drivers as badges
- "Open Full View" button

**`AuraMiniReport`**: Compact card showing:
- Report title
- Key metrics summary
- "Open Full View" button

Implementation approach:
- Change `Message` interface to support rich content: `content: string | { type: string; data: any; summary: string }`
- When job completes, push a rich message instead of plain text
- In the message rendering loop, check if content is object and render the appropriate mini-widget
- Each mini-widget has a "View Full" button that navigates + closes AURA

### Phase 5: Fullscreen Mode

**File: `src/components/AURA.tsx`**

Add fullscreen state:
```
const [isFullscreen, setIsFullscreen] = useState(false);
```

Add a "Maximize" button in the header (next to collapse/close buttons):
```
<Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
  {isFullscreen ? <Minimize2 /> : <Maximize2 />}
</Button>
```

When fullscreen:
- Change the panel container from `fixed right-0 top-0 h-full w-full md:w-1/3 z-40` to `fixed inset-0 z-[10004]`
- Add `backdrop-blur-md` overlay behind (separate div with `fixed inset-0 z-[10003] bg-black/40 backdrop-blur-sm`)
- Constrain content width: `max-w-4xl mx-auto` for readability
- Header stays pinned, input stays pinned at bottom
- Body scrolls independently
- Escape key exits fullscreen

The fullscreen AURA should feel like a cockpit:
- Wider message bubbles (max-w-[90%] instead of 80%)
- Larger font in fullscreen
- More prominent quick actions sidebar (optional)

### Phase 6: Multi-Command Chaining

**File: `supabase/functions/aura/index.ts`**

Update the system prompt to instruct the AI to handle sequential requests:
```
MULTI-COMMAND PROTOCOL:
If user requests multiple actions (e.g., "Run macro on EURUSD then setup"):
1. Execute the FIRST action by calling the appropriate tool
2. In your text response, acknowledge both requests
3. After the first job completes, the user can request the second action
Note: You can only call ONE feature tool per message (launch_ai_trade_setup OR launch_macro_commentary OR launch_report).
For technical analysis (price + indicators), you CAN call both tools simultaneously.
```

**File: `src/components/AURA.tsx`**

Add a pending queue for chained commands:
```
const pendingCommands = useRef<string[]>([]);
```

When a job completes and there are pending commands, auto-send the next command after a 1-second delay.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/AURA.tsx` | Memory ref, markdown rendering, mini-widgets, fullscreen mode, message type enrichment, pending queue |
| `supabase/functions/aura/index.ts` | Tool schema fixes, session memory injection, multi-command prompt, updated system prompt |

## What Does NOT Change
- No API endpoints modified
- No JSON schemas changed
- No existing components altered (TradeSetupDisplay, MacroCommentaryDisplay, etc.)
- No database schema changes
- Realtime job tracking architecture unchanged
- Edge function URL unchanged
- All existing features preserved (collective intelligence, batch technical analysis, language detection)

## Implementation Order
1. Phase 2 (tool schema fix) — quick, high-impact
2. Phase 3 (markdown rendering) — visual improvement
3. Phase 1 (contextual memory) — UX improvement
4. Phase 4 (mini-widgets) — core feature
5. Phase 5 (fullscreen) — immersive mode
6. Phase 6 (multi-command) — advanced feature

