import * as React from "react";
import { useTypewriter } from "@/hooks/useTypewriter";
import { MacroCommentaryDisplay } from "@/components/MacroCommentaryDisplay";
import { Button } from "@/components/ui/button";
import { FastForward } from "lucide-react";

interface TypewriterRendererProps {
  content: string | object;
  originalQuery?: string;
  isNew: boolean;
}

export function TypewriterRenderer({ content, originalQuery, isNew }: TypewriterRendererProps) {
  const isString = typeof content === "string";
  const textContent = isString ? (content as string) : "";

  const { displayedText, isAnimating, skip } = useTypewriter(textContent, {
    speed: 5,
    enabled: isNew && isString,
  });

  // Object content → render structured cards instantly
  if (!isString) {
    return <MacroCommentaryDisplay data={content} originalQuery={originalQuery} />;
  }

  // String content → typewriter effect
  const shownText = isNew ? displayedText : textContent;

  return (
    <div className="relative">
      {isAnimating && (
        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={skip} className="h-7 px-2 text-muted-foreground hover:text-foreground">
            <FastForward className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
        {shownText}
        {isAnimating && (
          <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  );
}
