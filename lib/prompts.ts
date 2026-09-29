import type { AnalysisKind, Period } from "@/types/analysis";

const CONTEXT_BLOCK = `CRITICAL FACTUAL GROUNDING & DUAL-SOURCE RECONFIRMATION COMPLIANCE:
1. ASTROLOGY (OFFICIAL DRIK PANCHANG): You MUST read the provided OFFICIAL DRIK PANCHANG context below for {{DATE}} and copy the EXACT Tithi, Nakshatra (with exact end timings), Yoga, Karana, Rahu Kalam, Yamaganda, and Abhijit Muhurta word-for-word as stated in Drik Panchang.
   - Ground all astrological timings strictly in Indian Standard Time (IST).
   - DO NOT hallucinate or guess Nakshatra transitions, Yoga shifts, or auspicious windows.
2. DUAL-SOURCE FINANCIAL PRICE RECONFIRMATION (Nifty 50, Bank Nifty, Sensex, MCX Silver):
   - You MUST cross-verify prices from BOTH financial sources provided in the context below:
     * Source A: Moneycontrol
     * Source B: Economic Times
   - Reconfirm that Nifty 50, Bank Nifty, Sensex, and MCX Silver baseline prices match between both sources before computing projected support/resistance, breakouts, and intraday targets.
   - Ground all price levels in current Indian market reality:
     * Nifty 50: ~24,000–24,500 range
     * Bank Nifty: ~57,000–58,500 range
     * Sensex: ~76,500–77,500 range
     * MCX Silver: ~₹2,30,000–₹2,45,000 per kg range (NOT outdated 85k figures).
   - DO NOT invent fictitious numbers.

{{WEB_CONTEXT}}`;

// Dynamic JSON Contract builder to ensure exact columns are returned for each timeframe
function buildJsonContract(keys: string[], footerNote?: string): string {
  const keysList = keys.map((key) => `- ${key}`).join("\n");
  const footerStr = footerNote
    ? `\nInclude footer/summary rows as normal objects using time_ist values such as: ${footerNote}.`
    : "";

  return `Return only a raw JSON array. Do not return markdown, prose, explanation, preamble, or code fences.
Every object in the array must contain exactly these ${keys.length} string keys:
${keysList}

Map the requested table columns into those keys in order. Keep all details inside the matching JSON fields. All values must be strings.${footerStr}`;
}

const HIERARCHICAL_DECISION_RULES = `
### 🏛️ HIERARCHICAL DECISION MATRIX
| Priority | Timeframe | Decision Type | Overrides |
|:---:|:---|:---|:---|
| 1 | Yearly | Strategic Direction | All lower timeframes |
| 2 | Half-Yearly | Tactical Allocation | Quarterly, Monthly, Weekly, Daily |
| 3 | Quarterly | Sector Rotation | Monthly, Weekly, Daily |
| 4 | Monthly | Position Sizing | Weekly, Daily |
| 5 | Weekly | Entry/Exit Windows | Daily |
| 6 | Daily | Precision Entry/Exit | None |

* The longer timeframe ALWAYS overrides the shorter timeframe. Example: If Yearly says "Bearish", Daily BUY signals are only for short-term scalping with tight stops.

### 📊 NAKSHATRA & YOGA COMBINATION MATRIX SUMMARY
- Nakshatra Categories:
  - 🟢 Bullish (11): Ashwini, Rohini, Punarvasu, Pushya, Hasta, Swati, Anuradha, Uttara Ashadha, Dhanishta, Uttara Bhadrapada, Revati.
  - 🟡 Neutral (3): Mrigashira, Uttara Phalguni, Shravana.
  - 🔴 Bearish (13): Bharani, Krittika, Ardra, Ashlesha, Magha, Purva Phalguni, Chitra, Vishakha, Jyeshtha, Mula, Purva Ashadha, Shatabhisha, Purva Bhadrapada.
- Yoga Categories:
  - BEST (3): Sukarma, Shubha, Shobhana. (100% / Full Size Buy when paired with Bullish Nakshatra)
  - GOOD (6): Priti, Ayushman, Saubhagya, Dhruva, Vriddhi, Sadhya.
  - MILD BULLISH (6): Siddhi, Shiva, Brahma, Indra, Shukla, Siddha.
  - NEUTRAL/CAUTION (3): Vishkumbha, Harshana, Variyan.
  - BEARISH (1): Atiganda.
  - DANGER (7 - AVOID): Shoola, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti.
- Key Actions:
  - Bullish Nakshatra + Best/Good Yoga → AGGRESSIVE BUY / BUY (60-100% position size)
  - Bearish/Danger Yoga or Bearish Nakshatra + Danger Yoga → STAY CASH / AVOID (39 Danger combinations = 0% position size)

### ⚠️ CONFLICT RESOLUTION RULES
- Yearly Bearish + Daily Bullish: Daily bullish = short-term scalp only (tight stops)
- Yearly Bullish + Daily Bearish: Daily bearish = buying opportunity (dip)
- Abhijit + Vishti Karana: Abhijit overrides Vishti – but tighter stops
- Jupiter Hora + Rahu Kalam: Rahu Kalam overrides – AVOID
- Pushya Nakshatra + No Abhijit: No Abhijit overrides Pushya – NO NEW ENTRIES
- Eclipse Window (3 days before/after): CASH PREFERRED – no new positions (reduce size by 50-70%)
- Mercury Retrograde: Reduce position size by 30-50%

### 🎯 FINAL COMPLIANCE REMINDERS
1. If Abhijit absent → NO AUSPICIOUS WINDOW – NO NEW ENTRIES (Strategy column states this for all rows)
2. Always provide BOTH BUY and SELL strategies when bias allows.
3. Silver direction must match the market bias.
`;

const DAILY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – INTRADAY TRADING PLAN

Generate a structured, clean, and concise intraday trading plan for {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver across 8 standard time slots:
Time Slots: 09:15-09:37, 09:37-10:30, 10:30-11:36, 11:36-12:08, 12:08-12:24, 12:24-12:46, 12:46-13:30, 13:30-14:30, 14:30-15:30.

CRITICAL FORMATTING RULES — KEEP OUTPUT CONCISE AND HIGH-SIGNAL:
- Market Bias: State single bias keyword (e.g. BULLISH, BEARISH, NEUTRAL, VOLATILE / AVOID) followed by a short 1-line reason (max 15 words). DO NOT write lengthy multi-sentence paragraphs.
- Astrological Event: Terse format: "Nakshatra: [Name] (till [Time]) | Hora: [Planet] | Karana: [Name] | Yoga: [Name] | Restrictions: [Yamaganda/Gulika/Rahu/None] | Abhijit: [Active/Absent]".
- Technical Levels: Clean format with Anchor Close, S1/S2, R1/R2, Breakout levels.
- Silver: Clean format: "Anchor: ~Rs 2,42,000/kg | S: 2,40,000 / 2,38,000 | R: 2,44,000 / 2,46,000 | Entry: Buy/Sell setup, SL, T1, T2".
- Bullish / Bearish Sectors: List 2 sectors with 2 stocks each (e.g. "Pharma (Sun Pharma, Cipla) | FMCG (ITC, Dabur)").
- Actionable Strategy: Direct trade instruction with Position Size % and SL. If inauspicious window active: "AVOID — NO NEW ENTRIES ([Reason]). Size: 0% new."

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract(
  [
    "time_ist",
    "astro_event",
    "market_bias",
    "nifty_impact",
    "bank_nifty_impact",
    "mcx_silver_impact",
    "bullish_sectors",
    "bearish_sectors",
    "strategy"
  ],
  '"Risk Management", "Footer Summary"'
)}`;

const WEEKLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – WEEKLY TRADING PLAN

Generate a structured, clean, and concise weekly trading plan for the week starting {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. Each row is one trading day (Monday to Friday), plus a final Footer Row.

CRITICAL FORMATTING RULES — CONCISE & STRUCTURED:
- Market Bias: Single bias keyword + 1-line concise reason.
- Astrological Highlights: Terse format: "Tithi: [Name] | Nakshatra: [Name] | Yoga: [Name] | Karana: [Name] | Best Hora: [Planet] | Restrictions: [Times]".
- Technical Levels: Expected weekly/daily S1/S2, R1/R2, 20/50/200 EMA trend, RSI-14.
- Silver: Expected range (S/R) in ~Rs 2,30,000–2,45,000/kg band.
- Sectors: 2 Favoured sectors with 2 stocks each, 2 Bearish sectors with 2 stocks each.
- Actionable Strategy: Recommended entry window, Position Size %, and Stop Loss guidance.

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract(
  [
    "time_ist",
    "day",
    "astro_event",
    "market_bias",
    "nifty_impact",
    "bank_nifty_impact",
    "mcx_silver_impact",
    "bullish_sectors",
    "bearish_sectors",
    "strategy"
  ],
  '"Footer Row" or "Weekly Summary"'
)}`;

const MONTHLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – THE COMPLETE TIMEFRAME MASTER SYSTEM

Act as my Triple Confirmation trading professor. You are a world-class expert in Vedic Astrology (Jyotish), Technical Analysis, Fundamental Market Cues, and Time-Cycle Analysis. You speak in warm, direct Hinglish when explaining reasoning but present data professionally.

Generate a monthly trading plan for {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. Each row must be one week (4 weeks total), with a final footer row for month-end targets.

Requirements per week:
1. Major Astrological Events: Planet ingress, retrograde start/end, exaltation/debilitation, eclipse (solar/lunar) - mark 3 days before/after as "cash preferred", Vimshottari Dasha theme for the month.
2. Market Bias: Bullish/Bearish/Range with planetary reason.
3. Technical Ranges: Expected weekly support/resistance for Nifty, Bank Nifty, Sensex based on monthly pivot, round numbers.
4. Bullish Sectors: 2 sectors with 2 stocks each + astrological reason.
5. Bearish Sectors: 2 sectors with 2 stocks each + astrological reason.
6. Actionable Strategy: Best entry day(s), position size % of normal (reduce 40% during eclipse weeks), stop loss: 3-5% for swing trades.
7. Add a Footer Row: Gann 30/60/90-day cycle turning points within the month, key economic releases (RBI MPC, Fed, CPI, PPI), month-end Nifty target range and Silver target range.

Use previous month's closing data where available.

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract(
  [
    "time_ist",
    "dates",
    "astro_event",
    "market_bias",
    "nifty_impact",
    "bank_nifty_impact",
    "mcx_silver_impact",
    "bullish_sectors",
    "bearish_sectors",
    "strategy"
  ],
  '"Footer Row" or "Month-End Targets"'
)}`;

const HALF_YEARLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – THE COMPLETE TIMEFRAME MASTER SYSTEM

Act as my Triple Confirmation trading professor. You are a world-class expert in Vedic Astrology (Jyotish), Technical Analysis, Fundamental Market Cues, and Time-Cycle Analysis. You speak in warm, direct Hinglish when explaining reasoning but present data professionally.

Generate a half-yearly trading plan anchored to {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. Each row must be one month (6 months total), with a final footer row for half-year summary.

Requirements per month:
1. Key Astrological Events: Exact dates of Sun/Mercury/Venus/Mars/Jupiter/Saturn sign changes, retrograde periods, eclipses (with cash recommendation 3 days before/after), equinox/solstice.
2. Market Bias: Bullish/Bearish/Range with planetary reason.
3. Technical Ranges: Round monthly support/resistance for Nifty, Bank Nifty, Sensex, reference 20/50/200 EMA on monthly chart.
4. Primary Sector: Based on exalted planets, with two specific NSE stocks.
5. Secondary Sector: Hedge sector (e.g. Pharma, FMCG), with two specific NSE stocks.
6. Position Size Base: % of normal capital for that month (e.g. 80% during Jupiter exaltation, 50% during eclipse).
7. Major Risk: Specific weeks to avoid (e.g. eclipse windows).
8. Add a Footer Row: Half-year Nifty & Sensex target range, Half-year Silver target range, Gann 180-day cycle turning points, recommended portfolio hedge (Gold, Dollar index).

Use previous half-year's closing data where available.

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract(
  [
    "time_ist",
    "astro_event",
    "market_bias",
    "nifty_impact",
    "bank_nifty_impact",
    "mcx_silver_impact",
    "bullish_sectors",
    "bearish_sectors",
    "position_size_base",
    "strategy"
  ],
  '"Footer Row" or "Half-Year Summary"'
)}`;

const YEARLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – THE COMPLETE TIMEFRAME MASTER SYSTEM

Act as my Triple Confirmation trading professor. You are a world-class expert in Vedic Astrology (Jyotish), Technical Analysis, Fundamental Market Cues, and Time-Cycle Analysis. You speak in warm, direct Hinglish when explaining reasoning but present data professionally.

Generate an annual trading plan anchored to {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. Each row must be one quarter (4 quarters total), with a final footer row for year-end targets.

Requirements per quarter:
1. Major Astrological Events: All planet ingresses, retrogrades, solar/lunar eclipses (with cash windows), equinox/solstice dates.
2. Market Bias: Bullish/Bearish/Range with planetary reason.
3. Technical Ranges: Quarterly support/resistance for Nifty, Bank Nifty, Sensex based on previous year's close, round numbers.
4. Sector Allocation: Percentage allocation breakdown across sectors (e.g. Banking 40%, IT 20%, Metals 10%, Pharma 15%, Gold 15%).
5. Sample Stocks: 2 specific NSE symbols representing each allocated sector.
6. Position Size: % of normal capital for that quarter (adjust for Mercury/Saturn retrogrades, eclipses).
7. Key Hedge: Recommended hedge (e.g. Gold ETF, USD/INR, VIX futures) during expected corrections.
8. Add a Footer Row: Year-end Nifty & Sensex target, Year-end Silver target, Gann 360-day cycle turning points, major RBI/Fed meeting months, rebalancing triggers.

Use previous year's closing data where available.

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract(
  [
    "time_ist",
    "astro_event",
    "market_bias",
    "nifty_impact",
    "bank_nifty_impact",
    "mcx_silver_impact",
    "sector_allocation",
    "stock_focus",
    "position_size_base",
    "strategy"
  ],
  '"Footer Row" or "Year-End Targets"'
)}`;

const SECTOR_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – SECTOR STOCK SELECTOR & ANALYSIS

Perform a rigorous, high-conviction Stock Selection & Triple Confirmation Analysis for the **{{SECTOR}}** sector on **{{DATE}}**.

CRITICAL INSTRUCTIONS & ACCURACY STANDARDS:
1. Return 3 to 4 distinct stock cards where each item represents ONE specific company stock in the {{SECTOR}} sector (e.g., time_ist: "Stock 1: HDFC Bank", time_ist: "Stock 2: ICICI Bank", time_ist: "Stock 3: State Bank of India").
2. Real Numerical Precision (NO VAGUE TEXT OR TIME SLOTS IN CARD TITLES):
   - time_ist: "Stock [Number]: [Stock Name & NSE Symbol]"
   - astro_event (Astro Checklist): Sector Ruling Planet dignity today, Abhijit Muhurta timing (11:55-12:46 IST), Nakshatra & Yoga alignment, Inauspicious hours (Yamaganda/Gulika/Rahu) to avoid.
   - nifty_impact (Technical Score): Exact LTP (e.g. ₹1,642.50), 20 EMA (₹1,628.00), RSI-14 (58.4), Volume breakout vs 20-day average (1.6x).
   - bank_nifty_impact (Risk Checks): Strict Stop Loss % (2.0% to 2.8%), Max capital risk (1%), Position sizing % of normal (60-85%).
   - mcx_silver_impact (Targets / SL): Entry Range (e.g. ₹1,640 - ₹1,645), Target 1 (₹1,680), Target 2 (₹1,710), Stop Loss (₹1,600).
   - sector_focus (Sector Cues): Sector sentiment, FII/DII flow in the sector, relative strength vs Nifty 50 / Bank Nifty.
   - stock_focus (Stock Details): Fundamental drivers, quarterly earnings momentum, key resistance pivot breakout.
   - strategy (Verdict / Action): Clear verdict: "BUY SETUP (PASS) — Enter during Abhijit window above ₹1,645 with strict ₹1,600 SL" or "WAIT / AVOID (FAIL) — Volume expansion below 1.5x threshold".

${CONTEXT_BLOCK}

${buildJsonContract(
  [
    "time_ist",
    "astro_event",
    "nifty_impact",
    "bank_nifty_impact",
    "mcx_silver_impact",
    "sector_focus",
    "stock_focus",
    "strategy"
  ]
)}`;

export const MARKET_PROMPTS: Record<Period, string> = {
  daily: DAILY_PROMPT,
  weekly: WEEKLY_PROMPT,
  monthly: MONTHLY_PROMPT,
  half_yearly: HALF_YEARLY_PROMPT,
  yearly: YEARLY_PROMPT
};

export function buildPrompt(
  period: AnalysisKind,
  date: string,
  sector: string | undefined,
  webContext: string
): string {
  const template = period === "sector" ? SECTOR_PROMPT : MARKET_PROMPTS[period];

  return template
    .replaceAll("{{DATE}}", date)
    .replaceAll("{{SECTOR}}", sector ?? "General")
    .replaceAll("{{WEB_CONTEXT}}", webContext);
}
