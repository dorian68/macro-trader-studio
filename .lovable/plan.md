

# Match AURA Chat Text Colors and Font Size to Reference Screenshot

## What Changes

Based on the screenshot reference, two adjustments are needed:

1. **Text colors**: 
   - User messages: pure white text (`text-white`) -- currently uses `text-foreground` which may vary
   - Assistant messages: slightly muted/soft white (`text-[#d1d1d1]`) -- a warm light gray, not harsh white

2. **Font size**: 
   - Both user and assistant messages increase from `text-sm` (14px) to `text-[15px]` -- matching the comfortable reading size visible in the screenshot

## Technical Details

### File: `src/components/AURA.tsx`

**Bubble classes (lines 1172-1174)**

Current:
```
msg.role === 'user'
  ? 'bg-[#2f3e36] text-foreground'
  : 'bg-[#212121] text-foreground'
```

Updated:
```
msg.role === 'user'
  ? 'bg-[#2f3e36] text-white'
  : 'bg-[#212121] text-[#d1d1d1]'
```

**Font size in renderMessageContent (lines 416, 418, 422)**

Change all `text-sm` to `text-[15px] leading-relaxed` in:
- Line 416: assistant markdown container
- Line 418: user text paragraph
- Line 422: rich content container

## No Regression

- Bubble backgrounds stay `#2f3e36` (user) and `#212121` (assistant) -- unchanged
- Layout, spacing, rounded corners all unchanged
- Mini-widgets, chart attachments, markdown rendering untouched
- Only text color classes and font-size classes are swapped
- `leading-relaxed` ensures line spacing stays comfortable at the larger font size

