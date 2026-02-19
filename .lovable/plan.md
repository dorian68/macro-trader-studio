

# Make AURA Chat Bubbles Fully Rounded to Match Screenshot

## What Changes

The screenshot shows chat bubbles with a generous, pill-like rounding (similar to iMessage or WhatsApp). Currently:

- **Fullscreen mode**: uses `rounded-2xl` (16px) -- close but could be rounder
- **Normal mode**: uses `rounded-lg` (8px) -- noticeably too square

Both modes will be updated to `rounded-2xl` for consistent, smooth rounded bubbles matching the screenshot.

## Technical Details

### File: `src/components/AURA.tsx` (line 1171)

Current:
```
isFullscreen ? 'max-w-[90%] rounded-2xl px-5 py-3' : 'max-w-[80%] rounded-lg px-4 py-2'
```

Updated:
```
isFullscreen ? 'max-w-[90%] rounded-2xl px-5 py-3' : 'max-w-[80%] rounded-2xl px-4 py-3'
```

Changes in normal (non-fullscreen) mode only:
- `rounded-lg` becomes `rounded-2xl` -- matches the rounded bubble shape in the screenshot
- `py-2` becomes `py-3` -- slightly more vertical padding for a balanced pill shape

Fullscreen mode stays unchanged (already `rounded-2xl`).

## No Regression

- Background colors (`#2f3e36`, `#212121`) unchanged
- Text colors (`text-white`, `text-[#d1d1d1]`) unchanged
- Font size (`text-[15px]`) unchanged
- Layout, animations, widgets, charts all untouched
- Only border-radius and vertical padding in normal mode are updated

