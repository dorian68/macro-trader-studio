import React, { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StyledJsonViewerProps {
  data: unknown;
  depth?: number;
  initialExpanded?: boolean;
  maxDepth?: number;
  showTypeLabels?: boolean;
  keyName?: string;
  isLast?: boolean;
}

// Type badge styling configuration
const TYPE_CONFIG = {
  string: {
    border: "border-l-emerald-500/50",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/5",
  },
  number: {
    border: "border-l-amber-500/50",
    text: "text-amber-600 dark:text-amber-400",
    badge: "border-amber-500/30 text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/5",
  },
  boolean: {
    border: "border-l-sky-500/50",
    text: "text-sky-600 dark:text-sky-400",
    badge: "border-sky-500/30 text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/5",
  },
  null: {
    border: "border-l-slate-400/50",
    text: "text-muted-foreground italic",
    badge: "border-slate-400/30 text-muted-foreground",
    bg: "bg-muted/30",
  },
  object: {
    border: "border-l-violet-500/50",
    text: "text-violet-600 dark:text-violet-400",
    badge: "border-violet-500/30 text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/5",
  },
  array: {
    border: "border-l-blue-500/50",
    text: "text-blue-600 dark:text-blue-400",
    badge: "border-blue-500/30 text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/5",
  },
};

// Copy button component
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/50"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

// Type badge component
function TypeBadge({ type }: { type: keyof typeof TYPE_CONFIG }) {
  const config = TYPE_CONFIG[type];
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] px-1.5 py-0 h-4 font-mono font-normal",
        config.badge
      )}
    >
      {type}
    </Badge>
  );
}

// Primitive value renderer (string, number, boolean, null)
function JsonPrimitive({
  value,
  keyName,
  showTypeLabels = true,
}: {
  value: string | number | boolean | null;
  keyName?: string;
  showTypeLabels?: boolean;
}) {
  const getType = (): keyof typeof TYPE_CONFIG => {
    if (value === null) return "null";
    return typeof value as "string" | "number" | "boolean";
  };

  const type = getType();
  const config = TYPE_CONFIG[type];

  const formatValue = () => {
    if (value === null) return "null";
    if (typeof value === "string") {
      const isLong = value.length > 60;
      const displayText = isLong ? value.slice(0, 60) + "…" : value;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("font-mono text-sm", config.text)}>
                "{displayText}"
              </span>
            </TooltipTrigger>
            {isLong && (
              <TooltipContent
                side="top"
                className="max-w-md break-all font-mono text-xs"
              >
                {value}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (typeof value === "boolean") {
      return (
        <span className={cn("font-mono text-sm font-medium", config.text)}>
          {String(value)}
        </span>
      );
    }
    return (
      <span className={cn("font-mono text-sm", config.text)}>{value}</span>
    );
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 p-2 rounded-md border-l-2 transition-colors",
        config.border,
        config.bg,
        "hover:bg-muted/40"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {keyName !== undefined && (
          <>
            <span className="text-primary font-medium text-sm shrink-0">
              "{keyName}"
            </span>
            <span className="text-muted-foreground shrink-0">:</span>
          </>
        )}
        <div className="min-w-0 truncate">{formatValue()}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <CopyButton value={String(value)} />
        {showTypeLabels && <TypeBadge type={type} />}
      </div>
    </div>
  );
}

// Object/Array node renderer
function JsonNode({
  data,
  depth = 0,
  initialExpanded = true,
  maxDepth = 4,
  showTypeLabels = true,
  keyName,
}: StyledJsonViewerProps) {
  const shouldAutoExpand = depth < maxDepth && initialExpanded;
  const [expanded, setExpanded] = useState(shouldAutoExpand);

  // Handle primitives
  if (data === null || typeof data !== "object") {
    return (
      <JsonPrimitive
        value={data as string | number | boolean | null}
        keyName={keyName}
        showTypeLabels={showTypeLabels}
      />
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray
    ? data.map((item, index) => [String(index), item] as [string, unknown])
    : Object.entries(data);
  const isEmpty = entries.length === 0;
  const type = isArray ? "array" : "object";
  const config = TYPE_CONFIG[type];

  if (isEmpty) {
    return (
      <div
        className={cn(
          "group flex items-center justify-between gap-3 p-2 rounded-md border-l-2 transition-colors",
          config.border,
          config.bg
        )}
      >
        <div className="flex items-center gap-2">
          {keyName !== undefined && (
            <>
              <span className="text-primary font-medium text-sm">
                "{keyName}"
              </span>
              <span className="text-muted-foreground">:</span>
            </>
          )}
          <span className="text-muted-foreground font-mono text-sm">
            {isArray ? "[]" : "{}"}
          </span>
        </div>
        {showTypeLabels && <TypeBadge type={type} />}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "group flex items-center gap-2 w-full p-2 rounded-md transition-all",
          "hover:bg-muted/50 text-left",
          config.bg,
          "border-l-2",
          config.border
        )}
      >
        <div
          className={cn(
            "shrink-0 transition-transform duration-200",
            expanded && "rotate-90"
          )}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {keyName !== undefined && (
          <>
            <span className="text-primary font-medium text-sm">"{keyName}"</span>
            <span className="text-muted-foreground">:</span>
          </>
        )}

        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-4 font-mono ml-auto",
            config.badge
          )}
        >
          {isArray ? `Array(${entries.length})` : `Object(${entries.length})`}
        </Badge>
      </button>

      {/* Children */}
      {expanded && (
        <div className="ml-3 pl-3 border-l-2 border-border/40 space-y-1">
          {entries.map(([key, value], index) => (
            <JsonNode
              key={key}
              data={value}
              depth={depth + 1}
              initialExpanded={initialExpanded}
              maxDepth={maxDepth}
              showTypeLabels={showTypeLabels}
              keyName={key}
              isLast={index === entries.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main export component
export function StyledJsonViewer({
  data,
  depth = 0,
  initialExpanded = true,
  maxDepth = 3,
  showTypeLabels = true,
}: StyledJsonViewerProps) {
  return (
    <div className="font-mono text-xs space-y-1">
      <JsonNode
        data={data}
        depth={depth}
        initialExpanded={initialExpanded}
        maxDepth={maxDepth}
        showTypeLabels={showTypeLabels}
      />
    </div>
  );
}
