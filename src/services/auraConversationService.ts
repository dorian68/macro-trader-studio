import { supabase } from '@/integrations/supabase/client';

// ============================================================
// AURA Conversation Service — Supabase CRUD for threads & messages
// ============================================================

export interface AuraThread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_archived: boolean;
}

export interface AuraMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: any; // JSONB — rich structured payload
  created_at: string;
  seq: number;
}

const ACTIVE_THREAD_KEY = 'aura-active-thread-id';

// ---- Thread operations ----

export async function createThread(userId: string, title?: string): Promise<AuraThread> {
  const { data, error } = await supabase
    .from('aura_threads' as any)
    .insert({ user_id: userId, title: title || 'New Chat' } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AuraThread;
}

export async function listThreads(
  userId: string,
  limit = 50,
  offset = 0
): Promise<AuraThread[]> {
  const { data, error } = await supabase
    .from('aura_threads' as any)
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []) as unknown as AuraThread[];
}

export async function getThread(threadId: string): Promise<AuraThread | null> {
  const { data, error } = await supabase
    .from('aura_threads' as any)
    .select('*')
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AuraThread | null;
}

export async function updateThreadTitle(threadId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('aura_threads' as any)
    .update({ title } as any)
    .eq('id', threadId);
  if (error) throw error;
}

export async function deleteThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from('aura_threads' as any)
    .delete()
    .eq('id', threadId);
  if (error) throw error;
}

export async function archiveThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from('aura_threads' as any)
    .update({ is_archived: true } as any)
    .eq('id', threadId);
  if (error) throw error;
}

export async function touchThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from('aura_threads' as any)
    .update({ last_message_at: new Date().toISOString() } as any)
    .eq('id', threadId);
  if (error) throw error;
}

// ---- Message operations ----

export async function loadMessages(
  threadId: string,
  limit = 200
): Promise<AuraMessage[]> {
  const { data, error } = await supabase
    .from('aura_messages' as any)
    .select('*')
    .eq('thread_id', threadId)
    .order('seq', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []) as unknown as AuraMessage[];
}

export async function appendMessage(
  threadId: string,
  userId: string,
  role: AuraMessage['role'],
  content: any
): Promise<AuraMessage> {
  const { data, error } = await supabase
    .from('aura_messages' as any)
    .insert({
      thread_id: threadId,
      user_id: userId,
      role,
      content,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AuraMessage;
}

export async function updateMessage(
  messageId: string,
  content: any
): Promise<void> {
  const { error } = await supabase
    .from('aura_messages' as any)
    .update({ content } as any)
    .eq('id', messageId);
  if (error) throw error;
}

// ---- Active thread (localStorage) ----

export function getActiveThreadId(): string | null {
  return localStorage.getItem(ACTIVE_THREAD_KEY);
}

export function setActiveThreadId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_THREAD_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_THREAD_KEY);
  }
}

// ---- Auto-title generation ----

const INSTRUMENT_PATTERN = /\b([A-Z]{2,6}\/[A-Z]{2,6}|XAU|XAG|BTC|ETH|SPX|NDX|DXY|EUR|GBP|JPY|CHF|AUD|NZD|CAD|AAPL|MSFT|GOOGL|AMZN|TSLA|NVDA|META)\b/i;

export function generateThreadTitle(
  userMessage: string,
  featureType?: string,
  instrument?: string
): string {
  const detectedInstrument =
    instrument ||
    userMessage.match(INSTRUMENT_PATTERN)?.[0]?.toUpperCase() ||
    '';

  const featureLabels: Record<string, string> = {
    trade_generator: 'Trade Setup',
    macro_lab: 'Macro Analysis',
    reports: 'Report',
  };

  if (detectedInstrument && featureType && featureLabels[featureType]) {
    return `${detectedInstrument} — ${featureLabels[featureType]}`;
  }

  if (detectedInstrument) {
    return `${detectedInstrument} analysis`;
  }

  // Fallback: first 40 chars
  const clean = userMessage.replace(/\n/g, ' ').trim();
  return clean.length > 40 ? clean.slice(0, 40) + '…' : clean || 'New Chat';
}
