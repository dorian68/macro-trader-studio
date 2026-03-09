

## Remove emoji and mail icon from signup confirmation card

### Changes to `src/pages/Auth.tsx`

1. **Remove the mail icon circle** (lines 927-929): Delete the `div` containing the `<Mail>` icon
2. **Remove the 💡 emoji** (line 944): Keep the text, just remove the emoji

### Changes to `src/pages/EmailConfirmation.tsx`

1. **Remove the 💡 emoji** (line 111): Same fix for consistency

### Changes to locale files
- `src/locales/en/auth.json`, `src/locales/es/auth.json`, `src/locales/fa/auth.json`: If `checkSpam` key contains the emoji, clean it there too (currently the emoji is hardcoded in the TSX, not in the locale files, so no locale changes needed)

