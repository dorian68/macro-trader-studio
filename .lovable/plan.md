

## Add Authenticated User Email Indicator to Navbar

### What changes

**File: `src/components/Layout.tsx`**

Add a compact user identity block between the existing auth controls and the sign-out button (lines 146-178). The block will:

- Show a circular avatar fallback with the first letter of the email
- Display the email text (truncated with `max-w` + `truncate` on desktop, hidden on mobile to preserve space)
- Fall back to "Account" if email is unavailable
- Only render when `user` is truthy (no change to logged-out state)

The implementation reuses `useAuth()` already imported at line 6, accessing `user.email`. No new dependencies, no new components — just a small inline addition inside the existing authenticated `<div>` block.

### Layout placement

```text
[Logo] [Credits] ----spacer---- [Labs?] [History] [Admin?] [About Us ▾] [👤 user@email] [SignOut] [≡] [● Live]
```

On mobile (`< sm`): email text hidden, only the avatar circle shows. On desktop: email shown truncated to max 160px.

### Implementation detail

Insert after the "About Us" dropdown (line 174) and before the sign-out button (line 175):

```tsx
{/* User identity indicator */}
<div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/30 max-w-[200px]">
  <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-medium shrink-0">
    {(user.email?.[0] || 'A').toUpperCase()}
  </div>
  <span className="text-xs text-muted-foreground truncate">
    {user.email || 'Account'}
  </span>
</div>
```

On mobile menu (line 291), add the email below the asset/timeframe line so mobile users also see who's logged in.

### Files to modify
- `src/components/Layout.tsx` — add user identity block (2 insertions, ~10 lines total)

### No regressions
- No routing changes
- No auth logic changes
- No removal of existing elements
- No layout shifts (element is `hidden sm:flex`, fits within existing flex container)

