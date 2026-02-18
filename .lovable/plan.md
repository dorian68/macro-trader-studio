

# Update AURA Chat Bubble Colors to Match Reference Screenshot

## What Changes

Update the message bubble background colors in `src/components/AURA.tsx` to match the screenshot reference:

- **User bubbles**: Change from `#2a2d35` (neutral gray) to `#2f3e36` (dark muted green tint) -- matches the greenish-dark tone visible in the screenshot
- **Assistant bubbles**: Change from `#1a1d27` (blue-tinted dark) to `#212121` (pure dark charcoal) -- matches the near-black assistant area in the screenshot
- Non-fullscreen mode updated consistently

## Technical Details

**File**: `src/components/AURA.tsx` (lines 1172-1178)

Current:
```
user fullscreen:  bg-[#2a2d35]
user normal:      bg-[#2a2d35]
assistant fullscreen: bg-[#1a1d27]
assistant normal:     bg-muted
```

Updated to:
```
user fullscreen:  bg-[#2f3e36]
user normal:      bg-[#2f3e36]
assistant fullscreen: bg-[#212121]
assistant normal:     bg-[#212121]
```

## No Regression

- Text color stays `text-foreground` (unchanged)
- Layout, spacing, rounded corners all unchanged
- Mini-widgets, chart attachments, markdown rendering untouched
- Only background-color CSS classes are swapped

