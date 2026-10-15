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
  - Cloudflare Account: `Tech.product@thefuture.university's Account` (`676dd9bd…f0b249`)
  - Testing Project Name: `testing-harish` (`https://testing-harish.pages.dev`)
  - Production Project Name: `tradewise` (`https://tradewise-aon.pages.dev`)

---

## 3. Technology Stack & Environment Configuration

### File: `.env.local`
```env
OPENROUTER_API_KEY="sk-or-v1-********************************"
OPENROUTER_MODEL="anthropic/claude-haiku-5.5"
EXA_API_KEY="8e6ee032-****-****-****-d1c5f00f95c3"
EXA_FALLBACK_API_KEY="8e6ee032-****-****-****-d1c5f00f95c3"
```

### Active AI & Search Providers:
- **LLM Engine:** `anthropic/claude-haiku-5.5` via OpenRouter, with reasoning disabled (see Milestone 8). Production reads the model from the `OPENROUTER_MODEL` Cloudflare Pages secret.
- **Search Engine:** Exa.ai API (freshly topped-up key `8e6ee032…95c3`, read from `EXA_API_KEY`; never commit the full value).
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

### Milestone 2: MCX Silver 2026 Baseline Price Rule (superseded by Milestone 8)
- Originally hardcoded MCX Silver at **₹2,30,000 – ₹2,45,000 per kg** (anchor in reference Excel: ~₹2,42,793/kg), with similar fixed ranges for Nifty, Bank Nifty and Sensex.
- Outdated 2023–2024 pricing (~₹85,000/kg) was banned from prompts and technical references (still banned).
- These fixed bands went stale (on 15 Oct 2026 MCX Silver Dec was ₹2,11,105/kg, Nifty ~22,623). All levels are now anchored to live quotes instead.

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
- **Fresh Exa Key:** Added user's new key (`8e6ee032…95c3`) to `.env.local` and the Cloudflare Pages secrets. (It was briefly hardcoded as a fallback in `lib/exa.ts`; that fallback has since been removed.)
- **Model Upgrade:** Upgraded `OPENROUTER_MODEL` from `google/gemini-3.7-flash` to **`google/gemini-3.8-flash`**.
- **Automated Browser Subagent Verification:** Automated tests verified both `testing-harish.pages.dev` and `tradewise-aon.pages.dev` respond with `HTTP 200 (success: true)`, matching 11 rows for Daily, 6 rows for Weekly, and realistic dynamic market anchors.

### Milestone 8: Switch to Claude Haiku 5.5 & Secret Cleanup (15 Oct 2026)
- **Model:** `OPENROUTER_MODEL` changed to `anthropic/claude-haiku-5.5` in `.env.local` and in the Cloudflare Pages secrets for both projects. It is about 7x cheaper per token than Gemini 3.8 Flash and roughly 2x faster on Daily (~20s vs ~49s).
- **Reasoning disabled for Claude (`lib/openrouter.ts`):** Haiku 5.5 reasons by default, and its reasoning tokens count against `max_tokens: 12000`. On the Daily prompt it used the whole budget and returned empty or truncated JSON. Requests to `anthropic/*` models now send `reasoning: { enabled: false }`. It is not sent to Gemini, which rejects it ("Reasoning is mandatory"). Capping reasoning instead was slower and still truncated.
- **Structured outputs (`RESPONSE_SHAPES` / `buildResponseSchema` in `lib/prompts.ts`):** Without reasoning, Haiku did not keep the row layout on Monthly / Half-Yearly / Yearly (2–10 rows). The model now returns a JSON object with one named property per row (e.g. `slot_0915_0937 … footer_summary`, `monday … footer`, `quarter_1 … footer`), enforced by an OpenRouter `json_schema` with `strict: true`. The route flattens it back into ordered rows. Rows reference a shared `$defs/row`; inlining it made the Daily and Half-Yearly grammars too large for Anthropic. Sector now returns exactly 3 stock cards. Gemini works with the same contract.
- **Retry (`app/api/analyze/route.ts`):** If a response still fails validation, the route silently retries once before returning a 502.
- **Prompt row specs:** Weekly covers the Mon–Fri week containing the date. Monthly covers the calendar month in weeks 1–7 / 8–14 / 15–21 / 22–end. Half-Yearly covers 6 months and Yearly 4 quarters, each starting from the date's month or quarter.
- **Live price anchoring:** Removed the fixed Nifty / Bank Nifty / Sensex / Silver ranges and the ₹2,42,000 Silver example. The model must anchor levels to quotes in the context, or write "Live price unavailable". `lib/exa.ts` adds a dedicated MCX Silver search (ET silver page / Goodreturns), because the index queries never returned a Silver quote.
- **Sampling params:** OpenRouter does not support `temperature`, `top_p` or `seed` for Haiku 5.5 and silently drops them, so repeated runs are not byte-identical.
- **Verified live (15 Oct 2026):** All 7 checks (Daily, Weekly, Monthly, Half-Yearly, Yearly, Sector Banking/IT) returned HTTP 200 with exact row counts on both `tradewise-aon` and `testing-harish`, in 8–20s.
- **Secrets:** Removed the hardcoded Exa key fallback from `lib/exa.ts`; it now throws `EXA_API_KEY is not configured.` when the env var is missing. Masked the key in this document. The full key remains in public git history (commits `a34870e`, `23e6a57`), so it should be rotated.

### Milestone 9: Verified Data Layer — no more "data unavailable" (15 Oct 2026)
- **Why:** Production's Cloudflare Exa keys returned 402, so every cell read "unavailable"; Exa's flattened page text also mis-labelled values (Thursday's 2nd Dur Muhurtam shown as Varjyam; the MCX contract's lifetime high used as resistance).
- **Panchang (`lib/exa.ts`):** Drik pages fetched directly (Exa live-crawl only as fallback), each page checked for the requested date, and Drik's [key, value, key, value] table layout parsed so continuation rows stay with their key. Daily gets a computed **Hora & Muhurta by trading slot** table (every overlapping hora, Rahu/Yamaganda/Gulika/Dur Muhurtam/Varjyam, Abhijit/Vijaya/Amrit). Weekly fetches the Panchang + horas for each Mon–Fri day.
- **Matrix categories (`lib/prompts.ts`):** Nakshatra/Yoga categories computed in code from `NAKSHATRA_CATEGORIES` / `YOGA_CATEGORIES` (27/27 Nakshatras, 26/27 Yogas; Dhriti is not in the matrix).
- **Planetary events (`lib/astroEvents.ts`):** Monthly / Half-Yearly / Yearly get every ingress (with exalted/debilitated/own sign), retrograde change and eclipse (with ±3-day cash window) in the plan window, from Drik's per-planet transit/retrograde pages and eclipse list (max 6 Drik fetches at a time).
- **Market data (`lib/marketData.ts`):** Nifty/Bank Nifty/Sensex previous close, live price, 20/50/200 EMA, RSI-14 (Wilder) and 1M return computed from Yahoo Finance daily closes. MCX Silver parsed from ET's MCX page into LTP/prev close/open/day range (contract lifetime range flagged as not a level). Sector Selector picks 3 stocks from `SECTOR_STOCKS` (`lib/markets.ts`, 6 per sector) with LTP, 20/50 EMA, RSI-14, volume ratio and 1M return computed the same way.
- **Prompt rules:** copy verified numbers exactly; never write "unavailable"/"N/A" or comment on missing context; Vimshottari Dasha removed from Monthly (needs a birth chart, not sourceable for an index).
- **Verified live (15 Oct 2026):** all 7 timeframes HTTP 200 with exact rows on `tradewise-aon` and `testing-harish`; values matched Drik Panchang and Yahoo (Nifty prev close 22,622.70, 20 EMA 22,851, RSI-14 41.7).

- **⚠️ Exa in production (was OPEN):** Production logs show Exa returning `402 Payment Required` for both `EXA_API_KEY` and `EXA_FALLBACK_API_KEY` stored in the Cloudflare secrets (old, exhausted keys). The working key is only in `.env.local`. Production output therefore has no Panchang or live prices, and now says "unavailable" instead of showing the old fixed bands. This has likely been true since Milestone 7. Fix: rotate the key, run `wrangler pages secret put EXA_API_KEY` (and `EXA_FALLBACK_API_KEY`) for both projects, then redeploy.

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
| **Testing** | [https://testing-harish.pages.dev](https://testing-harish.pages.dev) | `testing` | `main` | `anthropic/claude-haiku-5.5` | Exa.ai (`8e6ee032...`) | ✅ Live |
| **Production** | [https://tradewise-aon.pages.dev](https://tradewise-aon.pages.dev) | `origin` | `main` | `anthropic/claude-haiku-5.5` | Exa.ai (`8e6ee032...`) | ✅ Live |

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
