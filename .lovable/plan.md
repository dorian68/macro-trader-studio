

# Chunk-based Reveal for Macro Lab Typewriter

## Overview

Replace the character-by-character animation with a word-chunk-based progressive reveal. The text is pre-split into display chunks (3-12 words), and each tick appends one chunk. Punctuation-aware pauses and progressive acceleration for long texts.

## Single file to modify: `src/hooks/useTypewriter.ts`

The `TypewriterRenderer.tsx` and `ForecastMacroLab.tsx` remain untouched -- all logic lives in the hook.

### New algorithm

1. **Pre-processing** on text change: split the text into chunks
   - Split by newlines first (preserve `\n` as separate chunks)
   - Within each line, group words into chunks of 3-12 words (randomized per chunk)
   - Each chunk stores its text and a computed delay

2. **Delay computation per chunk**
   - Base tick: 35-70ms (randomized)
   - If chunk ends with `.` `?` `!` : add 150-250ms pause
   - If chunk ends with `,` `;` `:` : add 60-120ms pause
   - **Fast mode**: if total text length > 2500 chars, double chunk sizes (6-20 words) and reduce base tick to 20-45ms

3. **Animation loop** (still uses `requestAnimationFrame`)
   - Track current chunk index (not char index)
   - Each tick: append the next chunk's text to displayed text
   - Single `setState` per tick (one chunk = one update)

4. **Same API**: `{ displayedText, isAnimating, skip, reset }` -- no changes needed in consumers

### Pseudocode

```
function precomputeChunks(text: string): Chunk[] {
  const isFastMode = text.length > 2500;
  const minWords = isFastMode ? 6 : 3;
  const maxWords = isFastMode ? 20 : 12;
  const baseTickMin = isFastMode ? 20 : 35;
  const baseTickMax = isFastMode ? 45 : 70;

  // Split by newlines, keep newlines
  // For each segment, split into word groups
  // Compute delay per chunk based on trailing punctuation
  return chunks; // { text: string, delay: number }[]
}
```

### Performance

- One `setState` per chunk (every 35-70ms) instead of per character
- Fewer total updates (a 1000-word text = ~100-150 chunks vs thousands of char updates)
- Same `requestAnimationFrame` + cleanup pattern
- `skip()` and `reset()` work identically

## No regression

- Hook API signature unchanged (speed param becomes base tick range seed)
- `TypewriterRenderer` calls the same hook with the same props
- All existing controls (Skip, Copy, Toggle) work as before
- Skeleton loading unaffected

