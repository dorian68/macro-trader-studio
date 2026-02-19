import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuraThread } from '@/services/auraConversationService';
import { formatDistanceToNow } from 'date-fns';

interface AURAHistoryPanelProps {
  threads: AuraThread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
  isFullscreen?: boolean;
}

export function AURAHistoryPanel({
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  isFullscreen,
}: AURAHistoryPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className={cn(
      "flex flex-col border-b border-white/[0.06] bg-[#0c0f13]",
      isFullscreen ? "max-h-[50vh]" : "max-h-[40vh]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>History</span>
          <span className="text-muted-foreground/60">({threads.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewChat}
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {threads.length === 0 && (
            <p className="text-xs text-muted-foreground/60 text-center py-6">
              No conversations yet
            </p>
          )}
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.04]",
                activeThreadId === thread.id && "bg-white/[0.06]"
              )}
              onClick={() => onSelectThread(thread.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  activeThreadId === thread.id ? "text-white" : "text-muted-foreground"
                )}>
                  {thread.title || 'New Chat'}
                </p>
                <p className="text-[10px] text-muted-foreground/50">
                  {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                </p>
              </div>
              {confirmDelete === thread.id ? (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      onDeleteThread(thread.id);
                      setConfirmDelete(null);
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setConfirmDelete(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(thread.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
