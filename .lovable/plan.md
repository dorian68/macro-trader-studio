

## SEO Metadata Audit & Improvements

### Current State

**Pages WITH SEOHead** (11): Homepage, Features, Pricing, About, Contact, Documentation, HelpCenter, Privacy, Terms, API, ResetPassword

**Pages WITHOUT SEOHead** (13+): Auth, Dashboard/TradingDashboard, Portfolio, History, Credits, Admin, Reports, MacroAnalysis, AISetup, ForecastPlayground, ComingSoon, NotFound, PaymentSuccess, PaymentCanceled, EmailConfirmation, EmailConfirmationSuccess, ProductPresentation, AlphaLensLabs, Backtester, ScenarioSimulator, AssetDetail, ForecastTradeGenerator, ForecastMacroLab, TestWebhook

**Title format issues**: Current titles use inconsistent formats — some say "alphaLens AI - ..." (homepage), others "Page | alphaLens AI". User wants "Page Name | AlphaLens".

**Description issues**: Several descriptions need to be checked for 120-160 char range.

### Changes

#### 1. Standardize all existing SEO titles and descriptions (`src/locales/en/common.json`)
Rewrite all `seo.*` entries to use "Page Name | AlphaLens" format, and ensure descriptions are 120-160 characters:

| Key | New Title | Description (chars) |
|---|---|---|
| defaultTitle | AlphaLens — AI-Powered Financial Research | ~150 |
| homeTitle | AlphaLens — AI-Powered Financial Research Platform | ~150 |
| featuresTitle | Features \| AlphaLens | ~140 |
| pricingTitle | Pricing \| AlphaLens | ~140 |
| aboutTitle | About \| AlphaLens | ~135 |
| contactTitle | Contact \| AlphaLens | ~130 |
| documentationTitle | Documentation \| AlphaLens | ~145 |
| helpCenterTitle | Help Center \| AlphaLens | ~140 |
| privacyTitle | Privacy Policy \| AlphaLens | ~130 |
| termsTitle | Terms of Service \| AlphaLens | ~135 |
| apiTitle | API \| AlphaLens | ~140 |
| resetPasswordTitle | Reset Password \| AlphaLens | ~130 |

Plus add new keys for all missing pages:
- authTitle, dashboardTitle, portfolioTitle, historyTitle, creditsTitle, adminTitle, reportsTitle, macroAnalysisTitle, aiSetupTitle, playgroundTitle, comingSoonTitle, notFoundTitle, paymentSuccessTitle, paymentCanceledTitle, labsTitle, etc.

#### 2. Add SEOHead to all pages missing it
Add `<SEOHead>` with appropriate title/description keys and canonical paths (for public pages) to every page component that currently lacks it. Authenticated pages get title/description but no canonical (they shouldn't be indexed).

**Public pages to add SEOHead + canonical**: Auth, ComingSoon, NotFound, ProductPresentation

**Authenticated pages to add SEOHead (no canonical)**: Dashboard, Portfolio, History, Credits, Admin, Reports, MacroAnalysis, AISetup, ForecastPlayground, AlphaLensLabs, Backtester, ScenarioSimulator, PaymentSuccess, PaymentCanceled, EmailConfirmation, EmailConfirmationSuccess, AssetDetail, ForecastMacroLab, ForecastTradeGenerator

#### 3. Add `noindex` for utility/auth-gated pages
For pages like PaymentSuccess, PaymentCanceled, EmailConfirmation, Admin, etc., add `<meta name="robots" content="noindex" />` via SEOHead (will add a `noIndex` prop).

#### 4. Update SEOHead component
Add optional `noIndex` boolean prop that renders `<meta name="robots" content="noindex, nofollow" />`.

### Files Modified
- `src/components/SEOHead.tsx` — add `noIndex` prop
- `src/locales/en/common.json` — add ~20 new SEO keys, rewrite existing ones
- `src/locales/es/common.json` — mirror new keys (Spanish)
- `src/locales/fa/common.json` — mirror new keys (Farsi)
- ~20 page files — add `<SEOHead>` imports and usage

### No visual layout changes.

