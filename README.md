# alphaLens.ai — Institutional-Grade Financial Intelligence Platform

<p align="center">
  <img src="public/alphalens_logo_new.png" alt="alphaLens.ai" height="120" />
</p>

<p align="center">
  <strong>AI-powered macro analysis, trade signal generation, and quantitative risk management for professional traders and financial institutions.</strong>
</p>

<p align="center">
  <a href="https://macro-trader-studio.lovable.app">Live App</a> · 
  <a href="#architecture">Architecture</a> · 
  <a href="#quantitative-engine">Quant Engine</a> · 
  <a href="#features">Features</a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Business Domain](#business-domain)
- [Quantitative Engine](#quantitative-engine)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Edge Functions (Backend)](#edge-functions-backend)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [About](#about)

---

## Overview

**alphaLens.ai** is a full-stack financial intelligence platform that combines **macroeconomic research**, **AI-driven trade signal generation**, and **quantitative risk surface analysis** into a single professional-grade application. It is a joint collaboration between **OptiQuant IA** (quantitative finance & AI) and **ABCG Research** (institutional macro research).

The platform targets professional traders, hedge fund analysts, and institutional investors who require actionable, data-driven insights across FX, crypto, and major index markets.

---

## Business Domain

### Core Financial Concepts

| Domain | Description |
|---|---|
| **Macro Commentary** | Event-driven macroeconomic analysis — central bank policy tracking, GDP/CPI impact, yield curve dynamics, cross-market contagion |
| **AI Trade Setups** | Regime-aware directional signals with entry, stop-loss (SL), take-profit (TP), risk/reward ratios, and confidence scores |
| **Monte Carlo Forecasting** | Stochastic simulation of price paths to derive probability distributions for target prices at multiple horizons |
| **Risk Surface Analysis** | 3D probability surface mapping the relationship between SL (σ), TP (σ), and hit probability — enabling optimal trade structuring |
| **Options-Style Thinking** | The risk surface is conceptually analogous to an **implied volatility surface** in options pricing — mapping strike/expiry to probability rather than IV |
| **Market Frictions Modeling** | Explicit modeling of spread, slippage, and microstructure noise as sigma-based adjustments to SL/TP levels |
| **Portfolio Analytics** | Position tracking, PNL calculation, AI-powered recommendations, and multi-asset portfolio management |
| **Credit/Subscription System** | Tiered access (Basic, Standard, Premium, Free Trial, Broker Free) with per-feature credit consumption and renewal cycles |

### Asset Coverage

- **FX Majors**: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CHF, USD/CAD, NZD/USD
- **Cryptocurrencies**: BTC/USD, ETH/USD, and major altcoins
- **Indices**: S&P 500, NASDAQ, DAX, and other major benchmarks
- **Commodities**: Gold (XAU/USD), Oil (WTI/Brent)

---

## Quantitative Engine

### Monte Carlo Price Forecasting

The platform uses a **stochastic Monte Carlo simulation engine** (hosted on AWS EC2) to generate probabilistic price forecasts:

1. **Volatility Estimation**: Computes realized volatility (σ_ref) from historical price data using ATR(14) and/or log-return standard deviation
2. **Path Simulation**: Generates N paths (default: 1,000) using a Student-t distribution with configurable degrees of freedom (ν), capturing fat tails observed in financial returns
3. **Skew Parameter**: Allows asymmetric return distributions (skew > 0 = bullish bias, skew < 0 = bearish bias)
4. **Multi-Horizon**: Simultaneous forecasting across multiple time horizons (1h, 4h, 24h, etc.)

### Risk Surface (Probability Surface)

The **Risk Surface** is a 3D visualization that maps:

- **X-axis**: Stop-Loss distance (in σ units)
- **Y-axis**: Target Probability (the desired probability of hitting TP before SL)
- **Z-axis**: Required Take-Profit distance (in σ units)

This is conceptually similar to an **options implied volatility surface** where:
- Instead of strike × expiry → IV, we have SL_σ × Target_Prob → TP_σ
- The surface enables **optimal trade structuring** by finding the SL/TP combination that maximizes expected value given a risk tolerance

#### Sigma-Based Risk Profiles

```
Conservative:  SL = 1.0σ, TP = 1.5σ, Target Prob = 80%  → "Regularity"
Moderate:      SL = 2.25σ, TP = 2.5σ, Target Prob = 62% → "Balance"
Aggressive:    SL = 5.0σ, TP = 3.5σ, Target Prob = 40%  → "Convexity"
```

### Market Frictions Module

Explicit microstructure cost modeling applied to SL/TP levels:

| Component | Description |
|---|---|
| **Spread** | Bid/ask gap at execution (asset-class dependent) |
| **Slippage** | Difference between theoretical and executed price |
| **Noise Buffer** | Safety margin against wicks and microstructure noise |
| **Trading Style α** | Asymmetric TP friction coefficient: scalping (0.10), intraday (0.20), breakout (0.30) |

Frictions are expressed in **sigma units** and added to the strategic SL to compute an effective SL. The probability is then recalculated via **bilinear interpolation** on the risk surface.

### Surface Interpolation

When market frictions shift the effective SL away from the grid points of the precomputed surface, **bilinear interpolation** is used to estimate the probability at the new (SL_σ, TP_σ) coordinate. This ensures continuous probability estimation without requiring recomputation of the entire surface.

---

## Features

### 1. Trade Generator
- Full pipeline: instrument selection → Monte Carlo forecast → quant validation → market thesis
- **Market Thesis** (qualitative): macro commentary, key drivers, strategy context, risk notes
- **Quant Validation** (quantitative): entry/median/TP/SL prices, R:R ratio, probability of TP before SL, confidence scores
- Risk surface 3D chart with interactive exploration
- Multiple horizon analysis (1h, 4h, 24h)

### 2. Macro Commentary Engine
- AI-generated macroeconomic analysis per instrument
- Economic calendar integration with market impact assessment
- Central bank policy tracking and cross-market implications
- Technical levels (support/resistance) with indicator overlays (RSI, ADX, ATR)

### 3. AURA — Conversational AI Assistant
- Multi-turn conversational interface with persistent thread history
- Intent-based routing to backend features (trade generation, macro analysis, reports)
- Rich widget rendering (charts, trade setups, market data)
- Credit-aware execution with engagement tracking
- Powered by LLM (configurable backend — Gemini / custom AWS-hosted models)

### 4. Research Reports
- Institutional-style PDF/HTML reports combining quant outputs and macro context
- Weekly and daily research briefs
- Historical archive with search functionality

### 5. AlphaLens Labs (Experimental)
- **Portfolio Analytics Suite**: PNL calculation, AI-powered recommendations
- **Alpha Scenario Simulator**: Macroeconomic stress testing (rate hikes, recessions, oil shocks)
- **Backtester**: Historical performance analysis of AI-generated trade setups
- **Forecast Playground**: Direct access to forecast-proxy and surface-proxy APIs

### 6. Portfolio Management
- Multi-portfolio support with position tracking
- AI recommendations with confidence scores
- Real-time price updates via WebSocket and lightweight-charts

### 7. Real-Time Data & Charts
- **TradingView Widget** integration for professional charting
- **Lightweight Charts** (TradingView) for custom candlestick rendering with live price updates
- Technical indicator overlays (RSI, ADX, ATR) via cached backend data
- News feed with category filtering

### 8. Admin Panel
- User management (create, delete, restore, plan assignment)
- Credit monitoring and manual adjustments
- Broker management and assignment
- Chart provider/display settings
- Jobs monitoring with real-time status tracking
- Stripe subscription plan overview
- Reactivation request management

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │Trade Gen │  │Macro Lab │  │  AURA   │ │
│  │(Signals) │  │(Forecast)│  │(Macro)   │  │  (Chat) │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│       └──────────────┴──────────────┴──────────────┘      │
│                          │                                │
│                   Supabase Client                         │
└──────────────────────────┬────────────────────────────────┘
                           │
              ┌────────────┴────────────────┐
              │    Supabase (Backend)        │
              │  ┌────────────────────────┐  │
              │  │   Edge Functions       │  │
              │  │  • forecast-proxy      │  │
              │  │  • surface-proxy       │  │
              │  │  • macro-lab-proxy     │  │
              │  │  • aura                │  │
              │  │  • stripe-webhook      │  │
              │  │  • create-checkout     │  │
              │  │  • portfolio-copilot   │  │
              │  │  • collective-insights │  │
              │  │  • refresh-news-feed   │  │
              │  │  • send-report-email   │  │
              │  │  • ... (20+ functions) │  │
              │  └───────────┬────────────┘  │
              │              │               │
              │  ┌───────────┴────────────┐  │
              │  │   PostgreSQL + RLS     │  │
              │  │  • jobs (async queue)  │  │
              │  │  • ai_trade_setups     │  │
              │  │  • user_credits        │  │
              │  │  • portfolios          │  │
              │  │  • aura_threads/msgs   │  │
              │  │  • news_feed           │  │
              │  │  • instruments         │  │
              │  │  • price_history_cache │  │
              │  │  • ... (25+ tables)    │  │
              │  └────────────────────────┘  │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │   AWS EC2 (Quant Backend)   │
              │  • Monte Carlo Engine       │
              │  • Risk Surface Computation │
              │  • Macro Analysis Pipeline  │
              │  • Trade Signal Generation  │
              └─────────────────────────────┘
```

### Async Job Pipeline

The platform uses an **asynchronous job-based architecture** for long-running AI computations:

1. **Frontend** creates a job row in the `jobs` table (status: `pending`)
2. **Edge Function** (proxy) forwards the request to the AWS backend, passing the `job_id`
3. **AWS Backend** processes the request, then updates the `jobs` table via Supabase API (status: `done`, `response_payload` populated)
4. **Frontend** subscribes to **Supabase Realtime** (Postgres Changes) on the `jobs` table, receiving the result as soon as it's written
5. **Credit engagement** is tracked: credits are "engaged" on submission and "consumed" on successful completion

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework with Suspense, lazy loading, and concurrent features |
| **TypeScript** | Type safety across the entire frontend codebase |
| **Vite** | Build tool with HMR, code splitting, and optimized production builds |
| **Tailwind CSS** | Utility-first CSS with custom design tokens (HSL-based theming) |
| **shadcn/ui** | Accessible component library (Radix primitives + Tailwind) |
| **TanStack Query** | Server state management with stale-while-revalidate caching |
| **React Router v6** | Client-side routing with lazy-loaded route components |
| **react-i18next** | Internationalization (EN, ES, FA) |
| **Lightweight Charts** | TradingView charting library for candlestick/price rendering |
| **Plotly.js** | 3D surface plots for risk surface visualization |
| **Recharts** | 2D charting for portfolio analytics and indicators |
| **Framer Motion** | UI animations and transitions |
| **react-helmet-async** | SEO meta tag management |

### Backend
| Technology | Purpose |
|---|---|
| **Supabase (Lovable Cloud)** | PostgreSQL database, Auth, Edge Functions, Realtime, Storage |
| **Deno (Edge Functions)** | Serverless backend logic (20+ functions) |
| **Stripe** | Payment processing, subscription management, webhooks |
| **AWS EC2** | Quantitative computation backend (Monte Carlo, risk surfaces, macro analysis) |

### Database (PostgreSQL via Supabase)
- **25+ tables** with Row-Level Security (RLS) policies
- **Role-based access control** via `user_roles` table with `has_role()` security definer function
- **Realtime subscriptions** for job status updates
- **Materialized views** for trade setup validation
- **Custom functions**: `try_engage_credit()`, `decrement_credit()`, `initialize_user_credits()`

### Quantitative / Financial Skills Applied
| Skill | Application |
|---|---|
| **Stochastic Modeling** | Monte Carlo simulation with Student-t distributed returns |
| **Volatility Modeling** | ATR-based and log-return σ estimation |
| **Risk Surface Construction** | 3D probability surface analogous to options IV surface |
| **Bilinear Interpolation** | Continuous probability estimation on discrete surface grids |
| **Market Microstructure** | Friction modeling (spread, slippage, noise buffer) |
| **Position Sizing** | Sigma-based SL/TP with risk profile calibration |
| **Portfolio Analytics** | PNL calculation, correlation analysis, AI recommendations |
| **Fat-Tail Distribution** | Student-t with configurable degrees of freedom (ν) for realistic return modeling |
| **Skewness Modeling** | Asymmetric return distributions for directional bias |
| **Time-Scaling of Volatility** | σ_h = σ_ref × √(h) for multi-horizon forecasting |

---

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/               # shadcn/ui primitives
│   ├── admin/            # Admin panel components
│   ├── aura/             # AURA conversational AI widgets
│   ├── auth/             # Authentication (Google OAuth, email)
│   ├── backtester/       # Backtesting components
│   ├── features/         # Feature page visuals
│   ├── homepage/         # Landing page sections
│   ├── labs/             # Experimental tools (risk surface, etc.)
│   └── portfolio/        # Portfolio management components
├── contexts/             # React contexts (Language, AURA)
├── hooks/                # Custom hooks (auth, credits, jobs, realtime)
├── lib/                  # Utilities (forecast math, frictions, interpolation)
├── locales/              # i18n translations (en, es, fa)
├── pages/                # Route-level page components
├── services/             # API service layers
└── integrations/         # Supabase client & auto-generated types

supabase/
├── functions/            # 20+ Deno Edge Functions
│   ├── forecast-proxy/   # Monte Carlo forecast API proxy
│   ├── surface-proxy/    # Risk surface API proxy
│   ├── macro-lab-proxy/  # Macro analysis API proxy
│   ├── aura/             # Conversational AI backend
│   ├── stripe-webhook/   # Payment webhook handler
│   ├── create-checkout/  # Stripe checkout session creation
│   ├── portfolio-copilot/# AI portfolio recommendations
│   └── ...
└── migrations/           # Database migration files
```

---

## Edge Functions (Backend)

| Function | Purpose |
|---|---|
| `forecast-proxy` | Proxies Monte Carlo forecast requests to AWS EC2 |
| `surface-proxy` | Proxies risk surface computation requests to AWS EC2 |
| `macro-lab-proxy` | Proxies macro analysis requests to AWS EC2 |
| `aura` | Conversational AI with intent routing and LLM integration |
| `create-checkout` | Creates Stripe checkout sessions for subscriptions |
| `stripe-webhook` | Handles Stripe payment events (subscription lifecycle) |
| `customer-portal` | Redirects to Stripe customer portal |
| `check-subscription` | Validates active subscription status |
| `activate-free-trial` | Provisions free trial credits |
| `renew-credits` | Periodic credit renewal based on plan parameters |
| `portfolio-copilot` | AI-powered portfolio analysis and recommendations |
| `collective-insights` | Aggregated market insights across user base |
| `refresh-news-feed` | Fetches and caches financial news |
| `send-report-email` | Generates and emails research reports |
| `send-contact-email` | Contact form email delivery |
| `fetch-historical-prices` | Historical OHLCV data retrieval and caching |
| `fetch-technical-indicators` | Technical indicator computation (RSI, ADX, ATR) |
| `import-abcg-portfolio` | Imports ABCG Research portfolio data |
| `reconcile-payments` | Payment reconciliation for billing accuracy |

---

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: install via [nvm](https://github.com/nvm-sh/nvm))
- npm or bun

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

The project requires Supabase connection credentials (automatically configured via Lovable Cloud). Additional secrets for Stripe, AWS endpoints, and LLM API keys are managed via Supabase Edge Function secrets.

---

## Deployment

- **Preview**: Automatic via Lovable — every commit deploys to the preview URL
- **Production**: Open [Lovable](https://lovable.dev/projects/22f2a47e-97ad-4d12-9369-04abd2bd2d8c) → Share → Publish
- **Custom Domain**: Project > Settings > Domains > Connect Domain

---

## About

**alphaLens.ai** is a joint venture between:

- **[OptiQuant IA](https://www.optiquant-ia.com/)** — Quantitative finance, AI development, and intelligent decision-making tools
- **[ABCG Research](https://research.albaricg.com/)** — Institutional-grade macroeconomic research and financial insights

Our mission: democratize access to institutional-grade financial analysis tools that were previously available only to large institutions.

---

<p align="center">
  <sub>Built with <a href="https://lovable.dev">Lovable</a> · Powered by Supabase · Quant engine on AWS</sub>
</p>
