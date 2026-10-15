# TradeWise Harish — Comprehensive Chat Context & Project Compendium

> **Date Compiled:** 15 October 2026  
> **Repository 1 (Origin / Production):** `https://github.com/KindaJayant/tradewise-harish.git`  
> **Repository 2 (Testing):** `https://github.com/KindaJayant/testing-harish.git`  
> **Production Deployment:** [https://tradewise-aon.pages.dev](https://tradewise-aon.pages.dev)  
> **Testing Deployment:** [https://testing-harish.pages.dev](https://testing-harish.pages.dev)  
> **Local Project Root:** `D:\projects\tradewise-harish`

---

## 1. Executive Summary & Goals

**TradeWise Harish** is an AI-powered astro-financial trading intelligence dashboard built on Next.js 14 (App Router) and deployed via Cloudflare Pages using `@cloudflare/next-on-pages` and Cloudflare Workers runtime.

The system synthesizes:
1. **Vedic Panchang / Astro Signals:** Dynamic Drik Panchang scraping (Tithi, Nakshatra, Yoga, Karana, Hora, Yamaganda, Rahu Kalam, Abhijit Muhurta) strictly locked to Indian Standard Time (IST coordinates `geoname-id=1273294`).
2. **Financial Technicals & Live Prices:** Real-time prices, 20 EMA, 50 EMA, 200 EMA, RSI-14, volume expansion ratios from Moneycontrol, Economic Times, Screener.in, and TradingView.
3. **Triple Confirmation Rules:** Confluence model requiring Astro timing + Technical breakout (>20 EMA, RSI > 50) + Risk checks (SL ≤ 2.5%, capital risk ≤ 1%) before issuing BUY, WAIT, or AVOID verdicts.
4. **Timeframes Supported:** Daily (11 standard slots from 09:15 to 15:30), Weekly (Mon–Fri + Weekly Summary), Monthly, Half-Yearly, Yearly, and Sector / Stock Selector.

---

## 2. Infrastructure, Git & Author Configuration

- **Developer / Author Identity:**
  - Name: `KindaJayant`
  - Email: `iamjayant246@gmail.com`
  - Global & local Git configs enforce Jayant's credentials (avoiding previous commits under other aliases).
- **Remotes Configured:**
  - `origin` -> `https://github.com/KindaJayant/tradewise-harish.git`
  - `testing` -> `https://github.com/KindaJayant/testing-harish.git`
- **Cloudflare Accounts & Projects:**
  - Cloudflare Account: `Tech.product@thefuture.university's Account` (`676dd9bd0c6ffcf75b2107c497f0b249`)
  - Testing Project Name: `testing-harish` (`https://testing-harish.pages.dev`)
  - Production Project Name: `tradewise` (`https://tradewise-aon.pages.dev`)

---

## 3. Technology Stack & Environment Configuration

### File: `.env.local`
```env
OPENROUTER_API_KEY="sk-or-v1-********************************"
OPENROUTER_MODEL="google/gemini-3.8-flash"
EXA_API_KEY="8e6ee032-****-****-****-d1c5f00f95c3"
EXA_FALLBACK_API_KEY="8e6ee032-****-****-****-d1c5f00f95c3"
```

### Active AI & Search Providers:
- **LLM Engine:** `google/gemini-3.8-flash` via OpenRouter.
- **Search Engine:** Exa.ai API (freshly topped-up key `8e6ee032-dab5-402b-ba30-d1c5f00f95c3`).
- **Edge Build Wrapper:** Node.js script `patch-fs.js` to patch Windows-specific Vercel CLI / Cloudflare build nuances:
  ```bash
  cmd /c "set NODE_OPTIONS=-r D:/projects/tradewise-harish/patch-fs.js && D:\projects\tradewise-harish\bin\npx.exe @cloudflare/next-on-pages@1.13.16"
  ```
- **Deployment Command:**
  ```bash
  D:\projects\tradewise-harish\bin\npx.exe wrangler@4.125.0 pages deploy .vercel/output/static --project-name testing-harish
  D:\projects\tradewise-harish\bin\npx.exe wrangler@4.125.0 pages deploy .vercel/output/static --project-name tradewise
  ```

---

## 4. Key Chronological Milestones & Issues Resolved

### Milestone 1: Benchmark Excel File Matching
- **Reference Files:** `Triple_Confirmation_Intraday_Plan_01_Sep_2026.xlsx` & `Triple_Confirmation_Intraday_Plan_01_Sep_2026 (1).xlsx` from `C:\Users\Jayant\Downloads`.
- Output structure aligned to match the 11 intraday slots:
  1. `09:15 - 09:37` (Opening Slot / Initial Volatility)
  2. `09:37 - 10:30`
  3. `10:30 - 11:36`
  4. `11:36 - 12:08`
  5. `12:08 - 12:24` (Peak Abhijit Muhurta)
  6. `12:24 - 12:46`
  7. `12:46 - 13:30`
  8. `13:30 - 14:30`
  9. `14:30 - 15:30` (Closing Slot / Rahu Kalam avoidance)
  10. `Risk Management` (Compulsory statutory rules)
  11. `Footer Row` (Daily summary / index matrix)

### Milestone 2: MCX Silver 2026 Baseline Price Rule
- MCX Silver in 2026 trades in the active range of **₹2,30,000 – ₹2,45,000 per kg** (anchor in reference Excel: ~₹2,42,793/kg).
- Outdated 2023–2024 pricing (~₹85,000/kg) was banned from prompts and technical references.

### Milestone 3: Concise Table Formatting & Removal of Essay Text
- Refactored `DAILY_PROMPT` and `WEEKLY_PROMPT` in `lib/prompts.ts`.
- Limited table cells to single-keyword biases, concise one-line rationale, and clean numerical ranges (`S1: ..., S2: ... | R1: ..., R2: ... | 20 EMA: ... | RSI-14: ...`).

### Milestone 4: Overhaul of Sector / Stock Selector
- **Prior Problem:** Selector returned vague generic commentary or used time slots as card titles.
- **Resolution:**
  - Individual stock cards now display concrete company names (e.g., `Stock 1: ICICI Bank (NSE: ICICIBANK)`).
  - Cards output exact numbers: Current Market Price (LTP), 20 EMA, 50 EMA, RSI-14, volume breakout multiplier (vs 20-day avg).
  - Explicit Risk & SL numbers (e.g., SL %, max capital risk %, position sizing %).
  - Direct Verdicts: **BUY SETUP (PASS)** or **WAIT / AVOID (FAIL)** based on technical threshold conformance and inauspicious window rules.

### Milestone 5: Sourcing Live Quotes (Screener.in & TradingView)
- Added direct Exa search queries targeted at `screener.in` and `tradingview.com` for CMP, P/E, ROCE, and market cap.

### Milestone 6: Reviving Under-Maintenance Website & Enforcing Total Parity
- Removed legacy Under-Maintenance overlays and restored active TradeWise UI on both `testing-harish` and `tradewise` Cloudflare Pages projects.
- Ensured both remotes (`origin` and `testing`) share the exact same Git commits and static build artifacts.

### Milestone 7: Exa Quota Outage, Price Drift Bug, and Model Upgrade
- **Issue:** Standalone Exa keys ran out of credits (`402 Payment Required` / `NO_MORE_CREDITS`).
- **Temporary Fix Explored & Reverted:** Temporarily tested OpenRouter's Perplexity web search plugin, but user instructed to revert all changes and use a fresh Exa API key instead.
- **Reversion:** Reverted cleanly with `git revert 3e24ac0`.
- **Fresh Exa Key:** Added user's new key `8e6ee032-dab5-402b-ba30-d1c5f00f95c3` to `.env.local` and `lib/exa.ts`.
- **Model Upgrade:** Upgraded `OPENROUTER_MODEL` from `google/gemini-3.7-flash` to **`google/gemini-3.8-flash`**.
- **Automated Browser Subagent Verification:** Automated tests verified both `testing-harish.pages.dev` and `tradewise-aon.pages.dev` respond with `HTTP 200 (success: true)`, matching 11 rows for Daily, 6 rows for Weekly, and realistic dynamic market anchors.

---

## 5. Architectural Directory Layout

```
D:\projects\tradewise-harish\
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts         # Edge API route handling analysis requests
│   ├── globals.css              # Styling and color scheme
│   ├── layout.tsx               # Root layout & metadata
│   └── page.tsx                 # Dashboard UI, timeframe tabs, sector selector
├── components/
│   ├── InputForm.tsx            # Date, Period, and Sector selector controls
│   └── ResultTable.tsx          # Data tables & SectorResultCards rendering
├── lib/
│   ├── exa.ts                   # Exa API queries, Drik Panchang URL & dual fallback
│   ├── markets.ts               # Sector and index definitions
│   ├── openrouter.ts            # OpenRouter LLM client with JSON-mode output
│   └── prompts.ts               # Master prompts (Daily, Weekly, Sector, Astro rules)
├── types/
│   └── analysis.ts              # TypeScript schemas for rows, requests & responses
├── patch-fs.js                  # Windows Next.js edge build shim
├── .env.local                   # API keys & model configuration
├── wrangler.toml                # Cloudflare Pages / Workers configuration
└── package.json                 # Next.js 14.2.30, React 18, Wrangler
```

---

## 6. Verification & Deployment Reference Table

| Target | Deployment URL | Git Remote | Git Branch | Model | Search Provider | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Testing** | [https://testing-harish.pages.dev](https://testing-harish.pages.dev) | `testing` | `main` | `google/gemini-3.8-flash` | Exa.ai (`8e6ee032...`) | ✅ Live |
| **Production** | [https://tradewise-aon.pages.dev](https://tradewise-aon.pages.dev) | `origin` | `main` | `google/gemini-3.8-flash` | Exa.ai (`8e6ee032...`) | ✅ Live |

---

## 7. Useful Quick Commands

- **Build for Cloudflare Edge:**
  ```cmd
  cmd /c "set NODE_OPTIONS=-r D:/projects/tradewise-harish/patch-fs.js && D:\projects\tradewise-harish\bin\npx.exe @cloudflare/next-on-pages@1.13.16"
  ```
- **Deploy to Testing:**
  ```cmd
  D:\projects\tradewise-harish\bin\npx.exe wrangler@4.125.0 pages deploy .vercel/output/static --project-name testing-harish
  ```
- **Deploy to Production:**
  ```cmd
  D:\projects\tradewise-harish\bin\npx.exe wrangler@4.125.0 pages deploy .vercel/output/static --project-name tradewise
  ```
- **Git Push Both Remotes:**
  ```bash
  git push origin main && git push testing main
  ```
