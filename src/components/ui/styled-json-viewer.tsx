import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface StyledJsonViewerProps {
  data: unknown;
  depth?: number;
  initialExpanded?: boolean;
}

export function StyledJsonViewer({ 
  data, 
  depth = 0, 
  initialExpanded = true 
}: StyledJsonViewerProps) {
  const [collapsed, setCollapsed] = useState(depth > 1 && !initialExpanded);

  // null
  if (data === null) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  // boolean
  if (typeof data === "boolean") {
    return (
      <span className={data ? "text-emerald-500" : "text-rose-500"}>
        {String(data)}
      </span>
    );
  }

  // number
  if (typeof data === "number") {
    return <span className="text-amber-500">{data}</span>;
  }

  // string
  if (typeof data === "string") {
    // Long strings: truncate with tooltip
    const isLong = data.length > 80;
    const displayText = isLong ? data.slice(0, 80) + "..." : data;
    return (
      <span className="text-emerald-400" title={isLong ? data : undefined}>
        "{displayText}"
      </span>
    );
  }

  // Array
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-muted-foreground">[]</span>;
    }
    return (
      <div className="inline">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs text-sky-400">
            Array({data.length})
          </span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border/50 pl-3">
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <span className="text-muted-foreground mr-2 text-xs">
                  {index}:
                </span>
                <StyledJsonViewer data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Object
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="text-muted-foreground">{"{}"}</span>;
    }
    return (
      <div className="inline">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs text-violet-400">
            Object({entries.length})
          </span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border/50 pl-3">
            {entries.map(([key, value]) => (
              <div key={key} className="py-0.5">
                <span className="text-primary font-medium">"{key}"</span>
                <span className="text-muted-foreground">: </span>
                <StyledJsonViewer data={value} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
