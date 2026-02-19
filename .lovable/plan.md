

# Market News Ultra-Dense Layout -- Bloomberg Terminal Style

## Root Cause

The main problem is **`flex-1` on every news item**. This distributes all available vertical space equally among items, making them stretch to fill the container regardless of their content height. Even with reduced padding, items expand to fill whitespace. This is the #1 source of spacing issues.

## Changes (all in `src/components/DashboardColumnCarousel.tsx`)

### 1. Remove flex-1 stretch from all news items

Replace `flex-1 min-h-0` with fixed minimal sizing on all 3 view modes. Items should only take the height their content needs.

**List mode** (line 85): Remove `flex-1 min-h-0` from the row div.
**Large mode** (line 101): Remove `flex-1 min-h-0` from the card div.
**Compact mode** (line 128): Remove `flex-1 min-h-0` from the card div.

### 2. News container: justify-start instead of stretch

Line 256: Change the news container from:
```
flex-1 min-h-0 flex flex-col gap-1 overflow-hidden
```
to:
```
flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden justify-start
```

Gap reduced from `gap-1` (4px) to `gap-0.5` (2px) and items pushed to top.

### 3. List mode -- ultra-compact single-line ticker

- Padding: `px-2.5 py-1.5` reduced to `px-2 py-1`
- Border: `rounded-lg` to `rounded-md` (less visual weight)
- Gap between elements: `gap-2` to `gap-1.5`

### 4. Compact mode -- tighter rows

- Padding: `px-2.5 py-1.5` reduced to `px-2 py-1`
- Thumbnail: `w-10 h-10` reduced to `w-8 h-8` (saves 8px per row)
- Gap: `gap-2.5` to `gap-2`
- Border: `rounded-lg` to `rounded-md`
- Placeholder icon: `h-5 w-5` reduced to `h-3.5 w-3.5`

### 5. Large mode -- compact cards

- Image: `h-16` reduced to `h-12`
- Inner padding: `p-2` to `px-2 py-1.5`
- Border: `rounded-lg` / `rounded-t-lg` to `rounded-md` / `rounded-t-md`
- Inner content gap: `gap-0.5` stays

### 6. Increase items per page

```
list: 8 -> 10
compact: 5 -> 6
large: 3 -> 4
```

### 7. Pagination bar

- Height: `h-7` to `h-6`
- Padding top: `pt-1` to `pt-0.5`

## Summary of visual impact

| Mode | Before | After |
|------|--------|-------|
| List | 8 items, padded rows, flex-stretched | 10 items, tight ticker rows, content-height only |
| Compact | 5 items, 40px thumbnails, stretched | 6 items, 32px thumbnails, top-aligned |
| Large | 3 items, 64px images, stretched | 4 items, 48px images, top-aligned |

## What does NOT change

- Colors, CATEGORY_COLORS palette
- Pagination logic, category filters, API
- Quick Access tab
- ToggleGroup view mode switcher
- Responsive behavior
- NewsFeedPanel (separate file)

