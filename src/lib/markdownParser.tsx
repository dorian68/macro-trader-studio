import * as React from "react";

/**
 * Lightweight Markdown-to-React parser for Macro-Labs output.
 * Supports: **bold**, bullet lists (- / *), macro driver pattern, standalone headers, line breaks.
 * Produces React elements only — no dangerouslySetInnerHTML.
 */

function parseInlineBold(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`${keyPrefix}-b-${match.index}`} className="font-semibold text-foreground">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function parseMarkdownToReact(text: string): React.ReactNode[] {
  if (!text) return [];

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: React.ReactNode[] = [];
  let keyIndex = 0;

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <div key={`bl-${keyIndex++}`} className="space-y-3">
          {bulletBuffer}
        </div>
      );
      bulletBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line → flush bullets + add spacing
    if (!trimmed) {
      flushBullets();
      elements.push(<div key={`sp-${keyIndex++}`} className="mb-3" />);
      continue;
    }

    // Bullet line: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      const content = bulletMatch[1];

      // Macro driver pattern: - **Title**: description
      const driverMatch = content.match(/^\*\*(.*?)\*\*:\s*(.*)/s);
      if (driverMatch) {
        const title = driverMatch[1];
        const desc = driverMatch[2];
        bulletBuffer.push(
          <div key={`drv-${keyIndex++}`} className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-sm text-muted-foreground leading-relaxed">
              {parseInlineBold(desc, `drv-d-${keyIndex}`)}
            </span>
          </div>
        );
        continue;
      }

      // Macro driver pattern without colon: - **Title** description
      const driverMatch2 = content.match(/^\*\*(.*?)\*\*\s+(.*)/s);
      if (driverMatch2) {
        const title = driverMatch2[1];
        const desc = driverMatch2[2];
        bulletBuffer.push(
          <div key={`drv2-${keyIndex++}`} className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-sm text-muted-foreground leading-relaxed">
              {parseInlineBold(desc, `drv2-d-${keyIndex}`)}
            </span>
          </div>
        );
        continue;
      }

      // Regular bullet
      bulletBuffer.push(
        <div key={`blt-${keyIndex++}`} className="flex items-start gap-2 py-0.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
          <span className="text-sm text-foreground leading-relaxed">
            {parseInlineBold(content, `blt-${keyIndex}`)}
          </span>
        </div>
      );
      continue;
    }

    // Not a bullet → flush any pending bullets
    flushBullets();

    // Standalone bold header: entire line is **Header**
    const headerMatch = trimmed.match(/^\*\*(.*?)\*\*$/);
    if (headerMatch) {
      elements.push(
        <div
          key={`hdr-${keyIndex++}`}
          className="mt-4 mb-2 text-sm font-semibold text-foreground border-b border-border/40 pb-1"
        >
          {headerMatch[1]}
        </div>
      );
      continue;
    }

    // Regular paragraph with inline bold
    elements.push(
      <div key={`p-${keyIndex++}`} className="text-sm leading-relaxed">
        {parseInlineBold(trimmed, `p-${keyIndex}`)}
      </div>
    );
  }

  flushBullets();
  return elements;
}
