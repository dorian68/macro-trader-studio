
The user wants to remove the conversation bubble icons (represented by the `MessageSquare` component from Lucide) in the AURA history panel to create a cleaner, more minimal look. Based on the request "dans history sur aura" (in history on AURA), this specifically refers to the thread list in the AURA conversational assistant's history panel.

### Proposed Changes

#### AURA Components
- **`src/components/aura/AURAHistoryPanel.tsx`**:
    - Remove the `<MessageSquare />` icon from the thread list item component.
    - Adjust the layout if necessary (though the existing `gap-2` and `px-4` padding should maintain a clean look even without the icon).
    - Remove the unused `MessageSquare` import.

### Technical Details
- The thread list is rendered inside a `ScrollArea` by mapping over the `threads` array.
- Each item currently has a flex container with `gap-2` containing the icon and a `div` for the title and timestamp.
- Removing the icon will shift the text content to the left, which aligns with the user's request for a cleaner ("épuré") interface.

```text
BEFORE:
[MessageSquare Icon] Thread Title
                     2 hours ago

AFTER:
Thread Title
2 hours ago
```

### No Side Effects
- This change is strictly visual and only affects the AURA history panel list items. It does not affect functionality or other parts of the application like the main history page or the chat bubbles themselves.
