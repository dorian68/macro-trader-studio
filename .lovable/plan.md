

# Semantic Markdown Parsing for Macro-Labs Output

## Problem

Macro-Labs output contains Markdown syntax (`**bold**`, `- bullet`, line breaks) that is rendered as raw plain text. Both the `TypewriterRenderer` (for string content) and `MacroCommentaryDisplay` (for structured `fundamental_analysis` items) display content via plain `<span>` or `<div>` elements with no markdown interpretation.

## Solution

Create a lightweight, safe Markdown-to-React parser utility and integrate it into the two render paths that display macro content. No external library needed -- a custom parser keeps bundle size minimal and avoids sanitization concerns entirely (no `dangerouslySetInnerHTML`).

## Changes (3 files: 1 new, 2 modified)

### 1. NEW: `src/lib/markdownParser.tsx`

A pure function `parseMarkdownToReact(text: string): React.ReactNode[]` that converts a markdown string into an array of React elements. Supports:

- `**bold**` -- rendered as `<strong className="font-semibold text-foreground">`
- Bullet lines starting with `- ` or `* ` -- rendered as styled list items
- **Macro driver pattern**: bullet lines starting with `- **Title**: description` get special treatment:
  - Title becomes a styled label (`text-sm font-semibold text-foreground`)
  - Content follows on the same line with normal weight
  - Increased vertical spacing between drivers (`space-y-3`)
- Standalone `**Header**` (bold on its own line, not inside a bullet) -- rendered as a sub-header with top margin and slightly larger font
- Line breaks preserved via block-level `<div>` per paragraph
- Section spacing: double newlines create `mb-3` gaps
- No HTML injection possible: the parser only produces React elements, never raw HTML strings

### 2. MODIFIED: `src/components/TypewriterRenderer.tsx`

Replace the plain-text rendering div (line 39) with the markdown parser:

**Before:**
```tsx
<div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
  {shownText}
</div>
```

**After:**
```tsx
<div className="text-foreground text-sm leading-relaxed">
  {parseMarkdownToReact(shownText)}
</div>
```

- Import `parseMarkdownToReact` from the new utility
- The typewriter effect continues to work identically -- it still reveals text progressively, but each render pass now parses whatever text is currently displayed
- The parser is pure and lightweight (no state, no side effects), so calling it on every render during animation has negligible cost
- Remove `whitespace-pre-wrap` since the parser handles line breaks via block elements

### 3. MODIFIED: `src/components/MacroCommentaryDisplay.tsx`

Apply markdown parsing to:

1. **`executive_summary`** (line 93-94): wrap in parser instead of plain `<p>` tag
2. **`fundamental_analysis` items** (line 111): each bullet point string gets parsed through the markdown parser, enabling bold indicator names to be styled
3. **`ai_insights_breakdown` toggle content** (lines 199, 219): when content is a string, parse it through markdown parser instead of rendering as plain text

This ensures structured data that contains markdown syntax (common in GPT/LLM output) renders correctly.

## Macro Driver Styling

When the parser detects the pattern `- **Label**: rest of text`, it produces:

```tsx
<div className="flex flex-col gap-0.5 py-1.5">
  <span className="text-sm font-semibold text-foreground">Label</span>
  <span className="text-sm text-muted-foreground leading-relaxed">rest of text</span>
</div>
```

For standalone bold headers (`**Section Title**` on its own line):

```tsx
<div className="mt-4 mb-2 text-sm font-semibold text-foreground border-b border-border/40 pb-1">
  Section Title
</div>
```

These styles use existing Tailwind utilities and CSS variables, maintaining the institutional aesthetic.

## What is NOT Touched

- No changes to `useTypewriter.ts` hook (animation logic unchanged)
- No changes to `ForecastMacroLab.tsx` (page layout, toggles, debug panel, trading levels, chart widgets all untouched)
- No changes to AURA components, routing, or tool logic
- No changes to `AIInteractionHistory.tsx` (it already delegates to `MacroCommentaryDisplay`)
- No changes to any edge functions or Supabase logic
- Copy button functionality unchanged
- TradingView widgets unchanged
- Responsive layouts unchanged

## Performance

- The parser is a single synchronous pass over the string (split by newlines, regex per line)
- During typewriter animation, it re-parses on each chunk reveal -- this is the same cost as React re-rendering the text node, since the parser produces a flat array of elements
- No DOM manipulation, no `innerHTML`, no external library overhead

