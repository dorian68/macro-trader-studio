

# Audit Z-Depth / Overlays — Auth Flow

## Layer Map (current state)

```text
Z-INDEX    COMPONENT                     FILE                              CONTEXT
--------   ---------------------------   --------------------------------  ----------------------
z-[10004]  SelectContent (default)       ui/select.tsx                     Portal - all selects
z-[10003]  DialogContent                 ui/dialog.tsx                     Portal - all dialogs
z-[10002]  DialogOverlay                 ui/dialog.tsx                     Portal - backdrop
z-[10002]  TooltipContent               ui/tooltip.tsx                    Portal - tooltips
z-[10001]  DropdownMenuContent          ui/dropdown-menu.tsx              Portal - dropdowns
z-[10001]  MacroCommentary fullscreen   MacroCommentary.tsx               Fixed panel
z-[10000]  ToastViewport                ui/toast.tsx                      Portal - toasts
z-[10000]  Toast (individual)           ui/toast.tsx                      Portal - toasts
z-50       PublicNavbar                  PublicNavbar.tsx                  Sticky header
z-50       OAuth processing overlay     Auth.tsx (line 719)               Fixed overlay
z-50       AURA bubble (collapsed)      AURA.tsx                          Fixed bottom-right
z-50       PersistentToast              PersistentToast.tsx               Fixed bottom-left
z-50       Sheet overlay + content      ui/sheet.tsx                      Portal
z-50       Broker Select (inline)       Auth.tsx (line 745)               className override
z-40       AURA expanded panel          AURA.tsx                          Fixed right panel
z-40       Layout header               Layout.tsx                         Sticky header
z-40       SideDrawer overlay          ui/side-drawer.tsx                 Fixed
z-[60]     FlashMessage                FlashMessage.tsx                   Fixed
z-[100]    Injector toasts (inline)    useRealtimeResponseInjector.tsx     Inline className
```

## Findings

### CRITICAL -- None

The auth flow has no critical z-depth bug. Dialogs (BrokerPicker, Reactivation) use the global `DialogContent` at z-[10003] via portal, which sits above everything. The Select inside the BrokerPicker dialog uses z-[10004], correctly above the dialog.

### HIGH

**H1 - OAuth processing overlay at z-50 conflicts with AURA bubble and PersistentToast**

The OAuth processing overlay (Auth.tsx line 719) uses `z-50`. AURA collapsed bubble and PersistentToast also use `z-50`. If a user triggers Google sign-in while PersistentToast or AURA bubble is visible (e.g. returning user with active jobs), these elements share the same z-level. The OAuth overlay backdrop uses `bg-background/80 backdrop-blur-sm` which should visually cover them, but DOM order determines which is on top -- and since Auth.tsx renders its overlay inside the page while PersistentToast/AURA are in the Layout, the toast/AURA could appear above the OAuth overlay.

**Impact**: During Google OAuth redirect-back, if PersistentToast happens to be visible, it could float above the "Processing Google sign-in" overlay, confusing the user.

**Fix**: Raise the OAuth overlay from `z-50` to `z-[9999]` to ensure it covers all non-dialog layers.

**H2 - OAuth overlay does NOT block scroll or keyboard interaction**

The overlay at line 719 (`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center`) does not use `pointer-events` or scroll-lock. Since the Auth page content is short and non-scrollable, scroll lock is not required. However, keyboard focus can still reach the login form behind the overlay (tab through email/password fields). There is no focus trap.

**Fix**: Add `aria-modal="true"` and `tabIndex={-1}` with auto-focus to the overlay card, or wrap in a Dialog for proper focus management. Minimal safe patch: add `pointer-events-none` on children behind the overlay.

### MEDIUM

**M1 - Sheet overlay (z-50) would appear behind Dialog (z-[10002])**

This is correct behavior -- Sheets at z-50 are below Dialogs at z-[10002/10003]. No issue, just documenting the hierarchy is sound.

**M2 - FlashMessage at z-[60] sits above OAuth overlay (z-50)**

`FlashMessage.tsx` uses `z-[60]`. If a flash message appears during OAuth processing, it would float above the processing overlay. This is minor since flash messages are transient and informational.

**Fix**: No change needed -- flash messages should be visible above overlays as they carry important feedback.

**M3 - AURA expanded panel (z-40) correctly below everything**

AURA expanded uses z-40 which is below the PublicNavbar (z-50). On the Auth page, AURA is not rendered (user is not logged in), so no conflict. No fix needed.

**M4 - Reactivation Dialog has no scroll lock**

Both BrokerPicker and Reactivation dialogs use Radix `Dialog` which handles focus trap and scroll lock natively via the portal. This is correct. No issue.

### LOW

**L1 - Inline toast classNames in useRealtimeResponseInjector use z-[100]**

Four toasts in `useRealtimeResponseInjector.tsx` add `className: "fixed top-4 left-4 z-[100] max-w-sm"`. This overrides the toast's native position and z-index. z-[100] is far below z-[10000] (ToastViewport). These inline styles likely have no effect since Radix Toast renders via portal, but the intent suggests the developer wanted them to be prominent. This is dead/misleading code.

**Fix**: Remove the `className` overrides from these toast calls as they have no visual effect (Radix portal ignores them).

---

## Patch Plan (minimal, no regression)

### Patch 1: OAuth overlay z-index (H1) -- `src/pages/Auth.tsx`
- Line 719: Change `z-50` to `z-[9999]`
- This ensures the overlay covers PersistentToast, AURA bubble, FlashMessage, and PublicNavbar during OAuth processing

### Patch 2: Focus management on OAuth overlay (H2) -- `src/pages/Auth.tsx`
- Add `role="dialog" aria-modal="true"` to the overlay div
- Add `autoFocus` to the Card inside to capture focus
- This prevents keyboard tabbing to the form behind

No other patches required. The Dialog/Select/Toast/Tooltip/Dropdown hierarchy is correctly ordered and uses portals consistently.

---

## Test Checklist

- [ ] Trigger Google Sign-In: verify the processing overlay covers the entire viewport including the navbar
- [ ] While OAuth overlay is showing: press Tab repeatedly -- verify focus stays within the overlay
- [ ] Press Escape while OAuth overlay is showing: verify it does NOT close (it should wait for the OAuth callback)
- [ ] Open BrokerPicker dialog: verify the Select dropdown appears above the dialog content
- [ ] Open Reactivation dialog: verify backdrop blocks clicks behind it
- [ ] Trigger a toast while a dialog is open: verify the toast appears above the dialog
- [ ] Mobile: verify OAuth overlay covers the full screen with no scroll behind
- [ ] Resize browser while OAuth overlay is visible: verify it remains full-screen

