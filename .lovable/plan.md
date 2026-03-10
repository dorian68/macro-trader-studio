

## Clean robots.txt

### What changes

Replace the current `public/robots.txt` (which allows everything with no blocks) with a properly structured file that:

1. **Single `User-agent: *` rule** — one block covering all crawlers (Google best practice; no need for per-bot rules when the policy is the same).
2. **Allow all public pages** — `Allow: /` as the default.
3. **Disallow private/auth-gated paths**: `/admin`, `/dashboard`, `/ai-setup`, `/macro-analysis`, `/reports`, `/portfolio`, `/history`, `/credits`, `/playground`, `/trade-generator`, `/macro-lab`, `/labs`, `/analytics`.
4. **Disallow utility/transactional paths**: `/payment-success`, `/payment-canceled`, `/email-confirmation`, `/confirm-success`, `/reset-password`, `/test-webhook`.
5. **Reference the sitemap**: `Sitemap: https://macro-trader-studio.lovable.app/sitemap.xml`

### File modified
- `public/robots.txt` — full rewrite

