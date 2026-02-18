

# Typewriter Effect for Macro Lab Commentary

## Overview

Add a progressive text reveal animation (like ChatGPT/Grok) to the Macro Lab results area. The effect activates when a new analysis arrives, with skeleton loading during API calls.

## Architecture

A new reusable `TypewriterText` hook + component handles the animation logic independently, keeping the existing rendering pipeline untouched.

## Files to create

### 1. `src/hooks/useTypewriter.ts` (new)

Custom hook that manages the typewriter animation:
- Takes `text: string`, `speed: number` (default 20ms), `enabled: boolean`
- Uses `requestAnimationFrame` + timestamp tracking (not `setState` per char)
- Stores displayed char count in a `useRef`, updates a single `displayedText` state in batches (every ~3 chars or 50ms) to avoid excessive re-renders
- Returns `{ displayedText, isAnimating, skip, reset }`
- `skip()` instantly shows full text
- `reset()` cancels current animation, resets state
- Cleans up timers on unmount or when `text` changes (cancels old animation, starts new one)
- Random variation: base speed +/- 30% per batch for natural feel

### 2. `src/components/TypewriterRenderer.tsx` (new)

Wrapper component used in the results area:
- Props: `content: string | object`, `originalQuery?: string`, `isNew: boolean`
- When `isNew` is true and content is a string: uses `useTypewriter` to reveal text progressively
- When content is an object: passes to `MacroCommentaryDisplay` as-is (structured data renders instantly since it's already broken into cards)
- Renders 3 small control buttons (right-aligned, muted style):
  - **Skip** (FastForward icon) - visible only during animation
  - **Copy** (Copy icon) - copies full text
  - **Typewriter toggle** (Type icon) - ON/OFF stored in localStorage key `alphalens_typewriter_enabled`
- Preserves line breaks via `whitespace-pre-wrap`

## Files to modify

### 3. `src/pages/ForecastMacroLab.tsx`

**Loading state** (lines 959-966): Replace the simple `Loader2` spinner with a skeleton block:
```tsx
{isGenerating && (
  <Card className="animate-fade-in">
    <CardContent className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Generating macro commentary...
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[75%]" />
      <Skeleton className="h-4 w-[85%]" />
      <Skeleton className="h-4 w-[60%]" />
    </CardContent>
  </Card>
)}
```

**Results rendering** (lines 1133-1141): Replace inline rendering with `TypewriterRenderer`:
- For string content: `<TypewriterRenderer content={section.content} isNew={index === 0} />`
- For object content: `<TypewriterRenderer content={section.content} originalQuery={analysis.query} isNew={index === 0} />`
- `isNew` is only true for the first (most recent) analysis to avoid re-animating old results

**State tracking**: Add a `latestAnalysisId` state (set to timestamp when new analysis arrives in `handleRealtimeResponse`). Pass it to `TypewriterRenderer` so it knows when content is fresh vs. already seen.

### 4. `src/components/MacroCommentaryDisplay.tsx`

No changes. The structured card rendering stays as-is.

## Behavior Summary

| State | What the user sees |
|-------|-------------------|
| Generating | Skeleton lines + "Generating macro commentary..." status |
| Response arrives (string) | Text appears letter by letter (~20ms/char with variation) |
| Response arrives (object) | Structured cards render instantly (MacroCommentaryDisplay) |
| User clicks Skip | Full text appears immediately |
| User toggles Typewriter OFF | All future responses render instantly |
| New generation during animation | Old animation cancels, skeleton appears, new animation starts |
| Navigating away | Timers cleaned up via useEffect cleanup |

## Performance

- No per-character setState: batch updates every ~50ms using requestAnimationFrame
- Timer cleanup on unmount and text change
- localStorage read for toggle preference (once on mount)
- Zero impact on existing components

## No Regression Guarantee

- No endpoint/payload changes
- No JSON structure changes
- MacroCommentaryDisplay unchanged
- All existing features (charts, debug panel, tabs, levels extraction) untouched
- Only the text rendering layer gets the animation wrapper

