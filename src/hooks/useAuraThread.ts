import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as svc from '@/services/auraConversationService';
import type { AuraThread, AuraMessage } from '@/services/auraConversationService';

// ============================================================
// useAuraThread — React hook wrapping ConversationService
// ============================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string | RichContent;
  attachments?: Array<{ type: 'market_chart'; payload: any }>;
  _dbId?: string; // Supabase message ID for updates
}

export interface RichContent {
  type: string;
  data: any;
  summary: string;
  rawJson?: string;
  meta?: {
    featureId: string;
    instrument: string;
    elapsedMs?: number;
  };
}

// Convert DB message → local Message
function dbToLocal(m: AuraMessage): Message {
  const c = m.content as any;
  if (!c) return { role: m.role as 'user' | 'assistant', content: '', _dbId: m.id };

  // User messages stored as { type: "text", text: "..." }
  if (c.type === 'text' && typeof c.text === 'string') {
    return { role: m.role as 'user' | 'assistant', content: c.text, _dbId: m.id };
  }

  // Rich content (trade_setup, macro_commentary, report, tool_error)
  if (c.type && c.type !== 'text') {
    const rich: RichContent = {
      type: c.type,
      data: c.data,
      summary: c.summary || '',
      rawJson: c.rawJson,
      meta: c.meta,
    };
    return {
      role: m.role as 'user' | 'assistant',
      content: rich,
      attachments: c.attachments,
      _dbId: m.id,
    };
  }

  // Fallback: plain string
  if (typeof c === 'string') {
    return { role: m.role as 'user' | 'assistant', content: c, _dbId: m.id };
  }

  return { role: m.role as 'user' | 'assistant', content: JSON.stringify(c), _dbId: m.id };
}

// Convert local Message → JSONB for Supabase
function localToDb(msg: Message): any {
  if (typeof msg.content === 'string') {
    return { type: 'text', text: msg.content };
  }
  const rich = msg.content as RichContent;
  return {
    type: rich.type,
    data: rich.data,
    summary: rich.summary,
    rawJson: rich.rawJson,
    meta: rich.meta,
    attachments: msg.attachments,
  };
}

export function useAuraThread() {
  const { user } = useAuth();
  const [activeThread, setActiveThread] = useState<AuraThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<AuraThread[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const titleGeneratedRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  // Initialize: load active thread or start fresh
  const initialize = useCallback(async () => {
    if (!user?.id || initRef.current) return;
    initRef.current = true;

    try {
      // Migrate localStorage data if present
      await migrateLocalStorage(user.id);

      // Load thread list
      const threadList = await svc.listThreads(user.id);
      setThreads(threadList);

      // Restore active thread
      const savedId = svc.getActiveThreadId();
      if (savedId) {
        const thread = await svc.getThread(savedId);
        if (thread && thread.user_id === user.id) {
          setActiveThread(thread);
          const dbMessages = await svc.loadMessages(savedId);
          setMessages(dbMessages.map(dbToLocal));
          return;
        }
      }

      // No active thread — start with empty state
      setActiveThread(null);
      setMessages([]);
    } catch (err) {
      console.error('[useAuraThread] init error:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Reset init on user change
  useEffect(() => {
    if (!user?.id) {
      initRef.current = false;
      setActiveThread(null);
      setMessages([]);
      setThreads([]);
    }
  }, [user?.id]);

  const refreshThreadList = useCallback(async () => {
    if (!user?.id) return;
    const list = await svc.listThreads(user.id);
    setThreads(list);
  }, [user?.id]);

  const createNewChat = useCallback(async () => {
    if (!user?.id) return;
    const thread = await svc.createThread(user.id);
    setActiveThread(thread);
    setMessages([]);
    svc.setActiveThreadId(thread.id);
    await refreshThreadList();
  }, [user?.id, refreshThreadList]);

  const loadThread = useCallback(async (threadId: string) => {
    setIsLoadingThread(true);
    try {
      const thread = await svc.getThread(threadId);
      if (!thread) return;
      setActiveThread(thread);
      svc.setActiveThreadId(threadId);
      const dbMessages = await svc.loadMessages(threadId);
      setMessages(dbMessages.map(dbToLocal));
    } finally {
      setIsLoadingThread(false);
    }
  }, []);

  const ensureThread = useCallback(async (): Promise<string> => {
    if (activeThread) return activeThread.id;
    if (!user?.id) throw new Error('Not authenticated');
    const thread = await svc.createThread(user.id);
    setActiveThread(thread);
    svc.setActiveThreadId(thread.id);
    // Don't await refreshThreadList to avoid blocking
    refreshThreadList();
    return thread.id;
  }, [activeThread, user?.id, refreshThreadList]);

  // Persist a user message
  const persistUserMessage = useCallback(async (text: string): Promise<string> => {
    const threadId = await ensureThread();
    if (!user?.id) throw new Error('Not authenticated');

    const dbContent = { type: 'text', text };
    const dbMsg = await svc.appendMessage(threadId, user.id, 'user', dbContent);

    // Auto-title on first message
    if (!titleGeneratedRef.current.has(threadId)) {
      const title = svc.generateThreadTitle(text);
      await svc.updateThreadTitle(threadId, title);
      titleGeneratedRef.current.add(threadId);
      setActiveThread(prev => prev ? { ...prev, title } : prev);
    }

    await svc.touchThread(threadId);
    return dbMsg.id;
  }, [ensureThread, user?.id]);

  // Persist an assistant message
  const persistAssistantMessage = useCallback(async (
    msg: Message
  ): Promise<string> => {
    const threadId = await ensureThread();
    if (!user?.id) throw new Error('Not authenticated');

    const dbContent = localToDb(msg);
    const dbMsg = await svc.appendMessage(threadId, user.id, 'assistant', dbContent);
    await svc.touchThread(threadId);

    // Update title with richer info if this is the first tool result
    if (typeof msg.content !== 'string' && msg.content?.meta?.instrument) {
      const featureId = msg.content.meta.featureId;
      const instrument = msg.content.meta.instrument;
      const betterTitle = svc.generateThreadTitle('', featureId, instrument);
      await svc.updateThreadTitle(threadId, betterTitle);
      setActiveThread(prev => prev ? { ...prev, title: betterTitle } : prev);
    }

    return dbMsg.id;
  }, [ensureThread, user?.id]);

  // Update last assistant message in DB (e.g., replace loading with result)
  const updateLastAssistantInDb = useCallback(async (
    dbId: string,
    msg: Message
  ): Promise<void> => {
    const dbContent = localToDb(msg);
    await svc.updateMessage(dbId, dbContent);
  }, []);

  const deleteThreadById = useCallback(async (threadId: string) => {
    await svc.deleteThread(threadId);
    if (activeThread?.id === threadId) {
      setActiveThread(null);
      setMessages([]);
      svc.setActiveThreadId(null);
    }
    await refreshThreadList();
  }, [activeThread?.id, refreshThreadList]);

  return {
    activeThread,
    messages,
    setMessages,
    threads,
    isLoadingThread,
    createNewChat,
    loadThread,
    deleteThreadById,
    refreshThreadList,
    persistUserMessage,
    persistAssistantMessage,
    updateLastAssistantInDb,
    ensureThread,
  };
}

// ---- localStorage migration ----
async function migrateLocalStorage(userId: string) {
  const OLD_KEY = 'aura-conversation';
  const raw = localStorage.getItem(OLD_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as Array<{ role: string; content: any }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem(OLD_KEY);
      return;
    }

    const thread = await svc.createThread(userId, 'Imported Chat');
    for (const m of parsed) {
      const role = (m.role === 'user' ? 'user' : 'assistant') as AuraMessage['role'];
      const content = typeof m.content === 'string'
        ? { type: 'text', text: m.content }
        : m.content;
      await svc.appendMessage(thread.id, userId, role, content);
    }

    svc.setActiveThreadId(thread.id);
    localStorage.removeItem(OLD_KEY);
    console.log('[AURA] Migrated localStorage conversation to Supabase thread:', thread.id);
  } catch (err) {
    console.error('[AURA] localStorage migration failed:', err);
  }
}
