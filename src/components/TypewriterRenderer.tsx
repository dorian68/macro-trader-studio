import * as React from "react";
import { useTypewriter } from "@/hooks/useTypewriter";
import { MacroCommentaryDisplay } from "@/components/MacroCommentaryDisplay";
import { Button } from "@/components/ui/button";
import { FastForward, Copy, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "alphalens_typewriter_enabled";

interface TypewriterRendererProps {
  content: string | object;
  originalQuery?: string;
  isNew: boolean;
}

export function TypewriterRenderer({ content, originalQuery, isNew }: TypewriterRendererProps) {
  const { toast } = useToast();
  const [typewriterEnabled, setTypewriterEnabled] = React.useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== "false"; // default ON
    } catch {
      return true;
    }
  });

  const isString = typeof content === "string";
  const textContent = isString ? (content as string) : "";

  const { displayedText, isAnimating, skip } = useTypewriter(textContent, {
    speed: 20,
    enabled: isNew && isString && typewriterEnabled,
  });

  const toggleTypewriter = React.useCallback(() => {
    setTypewriterEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const copyText = React.useCallback(() => {
    const toCopy = isString ? textContent : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(toCopy).then(() => {
      toast({ title: "Copied", description: "Content copied to clipboard.", duration: 2000 });
    });
  }, [content, isString, textContent, toast]);

  // Object content → render structured cards instantly
  if (!isString) {
    return (
      <div className="relative">
        <div className="flex justify-end gap-1 mb-2">
          <Button variant="ghost" size="sm" onClick={copyText} className="h-7 px-2 text-muted-foreground hover:text-foreground">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <MacroCommentaryDisplay data={content} originalQuery={originalQuery} />
      </div>
    );
  }

  // String content → typewriter effect
  const shownText = isNew && typewriterEnabled ? displayedText : textContent;

  return (
    <div className="relative">
      <div className="flex justify-end gap-1 mb-2">
        {isAnimating && (
          <Button variant="ghost" size="sm" onClick={skip} className="h-7 px-2 text-muted-foreground hover:text-foreground">
            <FastForward className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={copyText} className="h-7 px-2 text-muted-foreground hover:text-foreground">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTypewriter}
          className={`h-7 px-2 ${typewriterEnabled ? "text-primary" : "text-muted-foreground"} hover:text-foreground`}
        >
          <Type className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
        {shownText}
        {isAnimating && (
          <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  );
}
