

## Fix: Remove Documentation from PublicNavbar + Restore Logo Visibility in Layout Navbar

### Root cause of logo disappearing
The logo `<button>` in `Layout.tsx` has no `shrink-0` class. In the authenticated navbar, there are many elements (credits, history, about dropdown, user email badge, logout, status indicator). The flex container (`max-w-screen-lg` = 1024px) gets crowded, and the logo button shrinks to near-zero width because flex items shrink by default. Adding `shrink-0` will prevent this.

### Changes

#### 1. Remove "Documentation" from PublicNavbar
**File**: `src/components/PublicNavbar.tsx`
- Remove `{ name: t('nav.documentation'), path: "/docs" }` from the `navigationItems` array (line 25).

#### 2. Fix logo shrinking in Layout navbar
**File**: `src/components/Layout.tsx`
- Add `shrink-0` to the logo button's className (line 103) so it never collapses when the navbar is crowded.
- This ensures the logo remains visible on all pages at all viewport widths.

### Files modified
- `src/components/PublicNavbar.tsx` — remove Documentation nav item
- `src/components/Layout.tsx` — add `shrink-0` to logo button

