import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Plus, Trash2, MessageSquare, Clock, X, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuraThread } from '@/services/auraConversationService';
import { formatDistanceToNow } from 'date-fns';

interface AURAHistoryPanelProps {
  threads: AuraThread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
  mode: 'sidebar' | 'overlay';
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AURAHistoryPanel({
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  mode,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: AURAHistoryPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Collapsed sidebar — icon-only mode
  if (mode === 'sidebar' && collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-col bg-[#0a0d10] h-full w-[56px] border-r border-white/[0.06] transition-all duration-250 ease-in-out">
          {/* Expand button */}
          <div className="flex items-center justify-center py-3 border-b border-white/[0.06]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-8 w-8 text-[#6b7280] hover:text-[#e5e7eb] hover:bg-white/[0.04]"
                  aria-label="Expand History"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1f2937] border-[#374151] text-[#f3f4f6]">
                Expand History
              </TooltipContent>
            </Tooltip>
          </div>

          {/* New Chat icon */}
          <div className="flex items-center justify-center py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNewChat}
                  className="h-8 w-8 text-[#6b7280] hover:text-[#e5e7eb] hover:bg-white/[0.04]"
                  aria-label="New Chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1f2937] border-[#374151] text-[#f3f4f6]">
                New Chat
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Thread icons */}
          <ScrollArea className="flex-1">
            <div className="py-1 flex flex-col items-center gap-0.5">
              {threads.map((thread) => (
                <Tooltip key={thread.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectThread(thread.id)}
                      className={cn(
                        "h-8 w-8 transition-colors",
                        activeThreadId === thread.id
                          ? "text-[#e5e7eb] bg-white/[0.06]"
                          : "text-[#6b7280] hover:text-[#e5e7eb] hover:bg-white/[0.04]"
                      )}
                      aria-label={thread.title || 'Chat thread'}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1f2937] border-[#374151] text-[#f3f4f6] max-w-[200px]">
                    <p className="truncate">{thread.title || 'New Chat'}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    );
  }

  const content = (
    <div className={cn(
      "flex flex-col bg-[#0a0d10] h-full transition-all duration-250 ease-in-out",
      mode === 'sidebar'
        ? "w-[260px] border-r border-white/[0.06]"
        : "w-[280px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#9ca3af]">
          <Clock className="h-3.5 w-3.5" />
          <span>History</span>
          <span className="text-[#6b7280]">({threads.length})</span>
        </div>
        <div className="flex items-center gap-0.5">
          {mode === 'sidebar' && onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-6 w-6 text-[#6b7280] hover:text-[#e5e7eb] hover:bg-white/[0.04]"
                  aria-label="Collapse History"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1f2937] border-[#374151] text-[#f3f4f6]">
                Collapse History
              </TooltipContent>
            </Tooltip>
          )}
          {mode === 'overlay' && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 text-[#6b7280] hover:text-[#e5e7eb]"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* New Chat button */}
      <div className="px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="w-full gap-1.5 text-xs h-9 border-[#374151]/50 bg-white/[0.02] hover:bg-white/[0.06] text-[#9ca3af] hover:text-[#e5e7eb]"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {threads.length === 0 && (
            <p className="text-xs text-[#6b7280] text-center py-6">
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
              <MessageSquare className="h-3.5 w-3.5 text-[#6b7280] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  activeThreadId === thread.id ? "text-[#e5e7eb]" : "text-[#9ca3af]"
                )}>
                  {thread.title || 'New Chat'}
                </p>
                <p className="text-[10px] text-[#6b7280]">
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
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[#6b7280] hover:text-destructive"
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

  if (mode === 'overlay') {
    return (
      <>
        {/* Backdrop */}
        <div
          className="absolute inset-0 z-10 bg-black/30"
          onClick={onClose}
        />
        {/* Slide-in panel */}
        <div className="absolute inset-y-0 left-0 z-20 animate-in slide-in-from-left duration-200">
          {content}
        </div>
      </>
    );
  }

  // Sidebar mode — just render the panel directly
  return content;
}
