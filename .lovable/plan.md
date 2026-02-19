

# AURA Conversation Manager — Supabase Persistence (ChatGPT-like)

## Overview

Transform AURA from an ephemeral chat (localStorage, 7 messages max) into a full conversation system with Supabase-backed threads, message persistence, history panel, and rich content replay.

## Current State

- AURA is a single 2015-line React component (`src/components/AURA.tsx`)
- Messages stored in `useState` + synced to `localStorage` (last 7 only)
- No thread concept -- every open is the same conversation
- Rich content (trade setups, macro cards, charts) rendered inline but not persisted structurally
- Tool calls (trade-generator, macro-lab, reports) work via `auraFeatureRegistry.ts` and realtime job subscriptions

## Phase 1: Database Schema

### New Tables (SQL migration)

**`aura_threads`**
- `id` uuid PK default `gen_random_uuid()`
- `user_id` uuid NOT NULL
- `title` text default `'New Chat'`
- `created_at` timestamptz default `now()`
- `updated_at` timestamptz default `now()`
- `last_message_at` timestamptz default `now()`
- `is_archived` boolean default `false`
- Indexes: `(user_id, last_message_at DESC)`

**`aura_messages`**
- `id` uuid PK default `gen_random_uuid()`
- `thread_id` uuid NOT NULL references `aura_threads(id)` ON DELETE CASCADE
- `user_id` uuid NOT NULL
- `role` text NOT NULL (CHECK: `user`, `assistant`, `tool`, `system`)
- `content` jsonb NOT NULL (rich structured payload)
- `created_at` timestamptz default `now()`
- `seq` bigint GENERATED ALWAYS AS IDENTITY
- Indexes: `(thread_id, seq ASC)`

### RLS Policies

All tables: SELECT/INSERT/UPDATE/DELETE restricted to `auth.uid() = user_id`.
For `aura_messages`: additional check that `thread_id` belongs to the user (via subquery or security definer function).

## Phase 2: Message Content Format (JSONB)

### User message
```json
{
  "type": "text",
  "text": "plot last 12h of gold price"
}
```

### Assistant message (text only)
```json
{
  "type": "text",
  "text": "Here is your analysis..."
}
```

### Assistant message (rich -- with widgets and charts)
```json
{
  "type": "rich",
  "summary": "### Trade Setup: XAU/USD -- Long\n\n...",
  "richType": "trade_setup",
  "data": { ... },
  "rawJson": "...",
  "meta": { "featureId": "trade_generator", "instrument": "XAU/USD", "elapsedMs": 12000 },
  "attachments": [
    { "type": "market_chart", "payload": { "mode": "candlestick", "data": { "ohlc": [...] } } }
  ]
}
```

### Tool trace (hidden by default, collapsible)
```json
{
  "type": "tool_call",
  "tool": "trade-generator",
  "status": "completed",
  "request": { ... },
  "response": { ... }
}
```

This format is future-proof and allows full replay of any message type.

## Phase 3: Conversation Service

Create `src/services/auraConversationService.ts`:

```text
ConversationService
  |-- createThread(userId): Promise<thread>
  |-- listThreads(userId, limit, offset): Promise<thread[]>
  |-- getThread(threadId): Promise<thread>
  |-- loadMessages(threadId, limit?): Promise<message[]>
  |-- appendMessage(threadId, userId, role, content): Promise<message>
  |-- updateThreadTitle(threadId, title): Promise<void>
  |-- deleteThread(threadId): Promise<void>
  |-- archiveThread(threadId): Promise<void>
  |-- touchThread(threadId): Promise<void>  // update last_message_at
  |-- getActiveThreadId(): string | null     // localStorage
  |-- setActiveThreadId(id): void            // localStorage
```

All operations use the existing Supabase client. No new edge functions needed.

## Phase 4: Auto-Title Generation

After the first assistant response in a new thread:
- Extract instrument name from the user query or response data
- Generate a short title like "XAU/USD -- Trade Setup" or "EUR/USD macro analysis"
- Fallback: first 40 chars of the user's first message
- Update the thread title via `updateThreadTitle()`

This is done client-side (no LLM call needed), using simple pattern matching on the first user message + feature type.

## Phase 5: UI Changes

### A) Thread History Sidebar

New component: `src/components/aura/AURAHistoryPanel.tsx`

- Rendered inside the AURA header area (toggle button)
- Lists threads sorted by `last_message_at DESC`
- Each item: title, relative time ("2h ago"), truncated last message
- Click = load thread messages + scroll to bottom
- "New Chat" button at top
- Delete thread (swipe or icon)
- Search by title (optional, v2)

### B) Modified AURA Header

Add to the header bar:
- "New Chat" button (plus icon) -- creates a new thread, clears messages
- "History" button (clock icon) -- toggles history panel
- Thread title display (editable on click, optional v2)

### C) Open Behavior (Critical)

When AURA opens:
1. Check `localStorage` for `aura-active-thread-id`
2. If found and thread exists: load its messages from Supabase, scroll to bottom
3. If not found: show empty "New Chat" state (no random old conversation)

### D) Scroll Behavior (Already Implemented)

The current scroll logic is solid:
- Auto-scroll on new message if near bottom
- "Jump to Latest" button if user scrolled up
- Keep as-is, no changes needed

### E) Message Bubbles (Already Implemented)

Current layout is correct:
- User = right aligned, green-ish bg
- Assistant = left aligned, dark bg
- Max-width 680px
- Rounded corners (rounded-2xl / rounded-xl)
- No changes needed

## Phase 6: Integration with Existing Tool Results

### Saving messages during tool execution flow

Current flow:
1. User sends message -> `setMessages(prev => [...prev, userMsg])`
2. Tool detected -> loading message added
3. Job created -> realtime subscription
4. Job completes -> rich content message replaces loading

New flow (additions in bold):
1. User sends message -> **append to Supabase** + setMessages
2. Tool detected -> **append loading message to Supabase**
3. Job created -> realtime subscription (unchanged)
4. Job completes -> **update the loading message in Supabase with rich content** + setMessages

Key: every `setMessages()` call is accompanied by a corresponding `appendMessage()` or update in Supabase. The local state remains the source of truth for rendering speed, but Supabase is the persistence layer.

### Replay on thread load

When loading a thread from history:
- Fetch all `aura_messages` for the thread ordered by `seq`
- Map each JSONB `content` back to the `Message` interface
- Rich content (charts, trade cards, macro cards) re-render from saved data
- Tool call messages render as collapsible traces

## Phase 7: Component Refactoring

The AURA component is 2015 lines. To keep changes manageable and avoid regression:

### New files to create:
1. `src/services/auraConversationService.ts` -- all Supabase CRUD
2. `src/hooks/useAuraThread.ts` -- hook wrapping ConversationService with React state
3. `src/components/aura/AURAHistoryPanel.tsx` -- thread list UI

### Modified files:
1. `src/components/AURA.tsx` -- integrate `useAuraThread` hook, replace localStorage logic, add history/new-chat buttons to header

### Files NOT modified (no regression):
- `src/lib/auraFeatureRegistry.ts` -- unchanged
- `src/components/aura/AURACollectivePanel.tsx` -- unchanged
- `src/components/aura/AURATeaser.tsx` -- unchanged
- `src/components/aura/MarketChartWidget.tsx` -- unchanged
- All page components (Dashboard, MacroLab, TradeGenerator, etc.) -- unchanged
- All edge functions -- unchanged
- Navbar, Layout, routing -- unchanged

## Phase 8: Migration of Existing localStorage Data

On first load after deployment:
- If `localStorage` has `aura-conversation` data and user is logged in:
  - Create a new thread
  - Import the messages into it
  - Clear the localStorage key
  - Set as active thread
- This ensures no data loss during transition

## Technical Details

### useAuraThread Hook API

```typescript
interface UseAuraThread {
  // State
  activeThread: Thread | null;
  messages: Message[];
  threads: Thread[];
  isLoadingThread: boolean;

  // Actions
  createNewChat(): Promise<void>;
  loadThread(threadId: string): Promise<void>;
  sendMessage(content: string): void;  // wraps existing sendMessage logic
  appendAssistantMessage(content: Message['content'], attachments?: any[]): Promise<void>;
  updateLastMessage(content: Message['content'], attachments?: any[]): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  refreshThreadList(): Promise<void>;
}
```

### Data Flow Diagram

```text
User types message
    |
    v
useAuraThread.sendMessage()
    |-- appendMessage(threadId, 'user', {...})  --> Supabase INSERT
    |-- setMessages(prev => [...prev, userMsg]) --> React state (instant UI)
    |-- touchThread(threadId)                   --> update last_message_at
    |
    v
AURA.sendMessage() (existing logic, unchanged)
    |
    v
Tool result / LLM response arrives
    |
    v
useAuraThread.appendAssistantMessage()
    |-- appendMessage(threadId, 'assistant', {...})  --> Supabase INSERT
    |-- setMessages(prev => [...prev, assistantMsg]) --> React state
    |-- Auto-title if first exchange
```

## Acceptance Criteria

1. Open AURA -> arrives on "New Chat" or last active thread, scrolled to bottom
2. Write 3 messages -> refresh page -> conversation intact, order preserved
3. Launch macro-labs from AURA -> result appears in chat AND is saved to Supabase
4. Launch trade-generator from AURA -> result appears in chat AND is saved to Supabase
5. Widgets (charts, trade cards) display in chat and reload correctly after refresh
6. Thread history: list threads, click to load, new chat button works
7. Fullscreen/reduced: same colors, rounded bubbles, assistant left / user right
8. No regression on existing pages or features

## Implementation Order

1. SQL migration (create tables + RLS)
2. `auraConversationService.ts`
3. `useAuraThread.ts` hook
4. `AURAHistoryPanel.tsx` component
5. Integrate into `AURA.tsx` (replace localStorage, add header buttons, wire persistence)
6. LocalStorage migration logic
7. Test end-to-end

