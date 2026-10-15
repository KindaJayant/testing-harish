import type { AnalysisKind, Period } from "@/types/analysis";

const CONTEXT_BLOCK = `CRITICAL FACTUAL GROUNDING & DUAL-SOURCE RECONFIRMATION COMPLIANCE:
1. ASTROLOGY (OFFICIAL DRIK PANCHANG): You MUST read the provided OFFICIAL DRIK PANCHANG context below for {{DATE}} and copy the EXACT Tithi, Nakshatra (with exact end timings), Yoga, Karana, Rahu Kalam, Yamaganda, and Abhijit Muhurta word-for-word as stated in Drik Panchang.
   - Ground all astrological timings strictly in Indian Standard Time (IST).
   - Daily plan intraday slots: Section 1B (HORA & MUHURTA BY TRADING SLOT) lists, for each slot, every overlapping hora, inauspicious window (Rahu Kalam, Yamaganda, Gulikai Kalam, Dur Muhurtam, Varjyam) and auspicious window (Abhijit, Vijaya Muhurta, Amrit Kalam). Use it as-is for that slot's Hora, Restrictions and Abhijit fields: the Restrictions field must list EVERY Inauspicious entry of that slot with its times (write "None" only when 1B says none). Do not re-derive overlaps yourself. If Section 1B is absent, write "Hora: unavailable".
   - Nakshatra and Yoga categories: copy them from the "Triple Confirmation categories" line in Section 1 / 1W; do not classify them yourself.
   - Weekly plan: Section 1W gives each trading day's Panchang, categories and market-hours horas. Use the matching day's values for that row; Best Hora = the most favourable hora in that day's list, with its time.
   - Monthly / Half-Yearly / Yearly plans: Section 1C is the complete list of planet ingresses (with dignity), retrograde changes and eclipses in the plan window, with exact dates. Use only these; for a period with no event write "No ingress, retrograde or eclipse".
   - DO NOT hallucinate or guess Nakshatra transitions, Yoga shifts, or auspicious windows. Mention only Panchang elements and timings that appear in the context (do not invent the next Karana or Yoga).
2. VERIFIED MARKET DATA FIRST (Nifty 50, Bank Nifty, Sensex, MCX Silver):
   - Section 0 (VERIFIED INDEX DATA) is computed from exchange closes. Copy each index's previous close, live price, 20/50/200 EMA and RSI-14 exactly as given there; never compute or estimate your own EMA or RSI. "Anchor Close" always means the previous close from Section 0.
   - Section 0B (VERIFIED MCX SILVER QUOTE): use the LTP as the Silver anchor and copy the previous close, open and day range as given, in Rs per kg. The contract lifetime range is NOT a support or resistance level. Never use outdated ~₹85,000/kg figures.
   - Derive S1/S2, R1/R2, breakout, target and stop-loss levels from these verified anchors (previous close, live price, day range, EMAs, round numbers). Do not use remembered or assumed price ranges.
   - Use Financial Source A (Moneycontrol) and Source B (Economic Times) for news, cues and cross-checks. If a snippet's price disagrees with Section 0/0B, trust Section 0/0B.
   - Sector plan: Section 0C lists verified data for the sector's candidate stocks. Choose exactly 3 of them and copy LTP (the live / today's close value if given, else the previous close), 20 EMA, 50 EMA, RSI-14, volume ratio and 1M return exactly. Relative strength = the stock's 1M return vs Nifty 50's 1M return in Section 0.
   - Never write "unavailable", "N/A", "not provided", "unverified" or "not in context". Build every cell from the verified sections; if a qualitative item (news, FII/DII flows, earnings, sentiment) has no data in the context, leave it out instead of flagging it. Never comment on what the context does or does not contain, in any field (including time_ist labels, which must be just the period label, e.g. "Week 1 (Oct 1-7, 2026)"). Only if a Section 0/0B/0C value itself reads "unavailable" may you say that price is unavailable. DO NOT invent fictitious numbers.

{{WEB_CONTEXT}}`;

interface ResponseShape {
  rowNames: string[];
  keys: string[];
}

// One named property per table row (in display order) and the string columns every row carries.
// The same shape drives the prompt contract and the structured-output schema, so the model cannot
// add, drop or reorder rows.
export const RESPONSE_SHAPES: Record<AnalysisKind, ResponseShape> = {
  daily: {
    rowNames: [
      "slot_0915_0937",
      "slot_0937_1030",
      "slot_1030_1136",
      "slot_1136_1208",
      "slot_1208_1224",
      "slot_1224_1246",
      "slot_1246_1330",
      "slot_1330_1430",
      "slot_1430_1530",
      "risk_management",
      "footer_summary"
    ],
    keys: ["time_ist", "astro_event", "market_bias", "nifty_impact", "bank_nifty_impact", "mcx_silver_impact", "bullish_sectors", "bearish_sectors", "strategy"]
  },
  weekly: {
    rowNames: ["monday", "tuesday", "wednesday", "thursday", "friday", "footer"],
    keys: ["time_ist", "day", "astro_event", "market_bias", "nifty_impact", "bank_nifty_impact", "mcx_silver_impact", "bullish_sectors", "bearish_sectors", "strategy"]
  },
  monthly: {
    rowNames: ["week_1", "week_2", "week_3", "week_4", "footer"],
    keys: ["time_ist", "dates", "astro_event", "market_bias", "nifty_impact", "bank_nifty_impact", "mcx_silver_impact", "bullish_sectors", "bearish_sectors", "strategy"]
  },
  half_yearly: {
    rowNames: ["month_1", "month_2", "month_3", "month_4", "month_5", "month_6", "footer"],
    keys: ["time_ist", "astro_event", "market_bias", "nifty_impact", "bank_nifty_impact", "mcx_silver_impact", "bullish_sectors", "bearish_sectors", "position_size_base", "strategy"]
  },
  yearly: {
    rowNames: ["quarter_1", "quarter_2", "quarter_3", "quarter_4", "footer"],
    keys: ["time_ist", "astro_event", "market_bias", "nifty_impact", "bank_nifty_impact", "mcx_silver_impact", "sector_allocation", "stock_focus", "position_size_base", "strategy"]
  },
  sector: {
    rowNames: ["stock_1", "stock_2", "stock_3"],
    keys: ["time_ist", "astro_event", "nifty_impact", "bank_nifty_impact", "mcx_silver_impact", "sector_focus", "stock_focus", "strategy"]
  }
};

export function buildResponseSchema(kind: AnalysisKind): Record<string, unknown> {
  const { rowNames, keys } = RESPONSE_SHAPES[kind];
  const rowSchema = {
    type: "object",
    properties: Object.fromEntries(keys.map((key) => [key, { type: "string" }])),
    required: keys,
    additionalProperties: false
  };

  // Rows reference one shared definition; inlining it per row makes the Daily and Half-Yearly
  // grammars too large for Anthropic's strict mode.
  return {
    type: "object",
    properties: Object.fromEntries(rowNames.map((name) => [name, { $ref: "#/$defs/row" }])),
    required: rowNames,
    additionalProperties: false,
    $defs: { row: rowSchema }
  };
}

// Dynamic JSON Contract builder to ensure exact rows and columns are returned for each timeframe
function buildJsonContract(kind: AnalysisKind, footerNote?: string): string {
  const { rowNames, keys } = RESPONSE_SHAPES[kind];
  const keysList = keys.map((key) => `- ${key}`).join("\n");
  const footerStr = footerNote
    ? `\nFor the footer/summary rows, use time_ist values such as: ${footerNote}.`
    : "";

  return `Return only a raw JSON object. Do not return markdown, prose, explanation, preamble, or code fences.
The object must contain exactly these ${rowNames.length} row properties, in this order: ${rowNames.join(", ")}.
Each row is an object with exactly these ${keys.length} string keys:
${keysList}

Map the requested table columns into those keys in order. Keep all details inside the matching JSON fields. All values must be strings.${footerStr}`;
}

type MatrixCategories = Array<[label: string, names: string[], note?: string]>;

// Triple Confirmation matrix. Drives both the prompt text and the classification line computed from
// the fetched Panchang, so the model never has to classify a Nakshatra or Yoga itself.
export const NAKSHATRA_CATEGORIES: MatrixCategories = [
  ["🟢 Bullish", ["Ashwini", "Rohini", "Punarvasu", "Pushya", "Hasta", "Swati", "Anuradha", "Uttara Ashadha", "Dhanishta", "Uttara Bhadrapada", "Revati"]],
  ["🟡 Neutral", ["Mrigashira", "Uttara Phalguni", "Shravana"]],
  ["🔴 Bearish", ["Bharani", "Krittika", "Ardra", "Ashlesha", "Magha", "Purva Phalguni", "Chitra", "Vishakha", "Jyeshtha", "Mula", "Purva Ashadha", "Shatabhisha", "Purva Bhadrapada"]]
];

export const YOGA_CATEGORIES: MatrixCategories = [
  ["BEST", ["Sukarma", "Shubha", "Shobhana"], "100% / Full Size Buy when paired with Bullish Nakshatra"],
  ["GOOD", ["Priti", "Ayushman", "Saubhagya", "Dhruva", "Vriddhi", "Sadhya"]],
  ["MILD BULLISH", ["Siddhi", "Shiva", "Brahma", "Indra", "Shukla", "Siddha"]],
  ["NEUTRAL/CAUTION", ["Vishkumbha", "Harshana", "Variyan"]],
  ["BEARISH", ["Atiganda"]],
  ["DANGER", ["Shoola", "Ganda", "Vyaghata", "Vajra", "Vyatipata", "Parigha", "Vaidhriti"], "AVOID"]
];

function formatCategories(categories: MatrixCategories): string {
  return categories
    .map(([label, names, note]) => `  - ${label} (${names.length}): ${names.join(", ")}.${note ? ` (${note})` : ""}`)
    .join("\n");
}

// Drik and the matrix spell some names differently (Dhanishtha/Dhanishta, Shula/Shoola,
// Variyana/Variyan, Vishkambha/Vishkumbha).
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/h/g, "")
    .replace(/oo/g, "u")
    .replace(/umb/g, "amb")
    .replace(/a$/, "");
}

export function classifyName(name: string, categories: MatrixCategories): string | null {
  const target = normalizeName(name);
  return categories.find(([, names]) => names.some((candidate) => normalizeName(candidate) === target))?.[0] ?? null;
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
${formatCategories(NAKSHATRA_CATEGORIES)}
- Yoga Categories:
${formatCategories(YOGA_CATEGORIES)}
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

Generate a structured, clean, and concise intraday trading plan for {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver across 9 standard time slots, followed by a Risk Management row and a Footer Summary row:
Time Slots: 09:15-09:37, 09:37-10:30, 10:30-11:36, 11:36-12:08, 12:08-12:24, 12:24-12:46, 12:46-13:30, 13:30-14:30, 14:30-15:30.

CRITICAL FORMATTING RULES — KEEP OUTPUT CONCISE AND HIGH-SIGNAL:
- Market Bias: State single bias keyword (e.g. BULLISH, BEARISH, NEUTRAL, VOLATILE / AVOID) followed by a short 1-line reason (max 15 words). DO NOT write lengthy multi-sentence paragraphs.
- Astrological Event: Terse format: "Nakshatra: [Name] (till [Time]) | Hora: [Planet] | Karana: [Name] | Yoga: [Name] | Restrictions: [Yamaganda/Gulika/Rahu/None] | Abhijit: [Active/Absent]".
- Technical Levels: Clean format: "Anchor Close: [previous close] | S1/S2: [..] | R1/R2: [..] | 20 EMA: [..] | RSI-14: [..] | Breakout: [..]", with Anchor Close, 20 EMA and RSI-14 copied from Section 0.
- Silver: Clean format: "Anchor: ~Rs [live MCX price]/kg | S: [S1] / [S2] | R: [R1] / [R2] | Entry: Buy/Sell setup, SL, T1, T2", with every level derived from the live MCX Silver price in the context.
- Bullish / Bearish Sectors: List 2 sectors with 2 stocks each (e.g. "Pharma (Sun Pharma, Cipla) | FMCG (ITC, Dabur)").
- Actionable Strategy: Direct trade instruction with Position Size % and SL. If inauspicious window active: "AVOID — NO NEW ENTRIES ([Reason]). Size: 0% new."

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract("daily", '"Risk Management", "Footer Summary"')}`;

const WEEKLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – WEEKLY TRADING PLAN

Generate a structured, clean, and concise weekly trading plan for the trading week (Monday to Friday) that contains {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. If {{DATE}} falls mid-week, still cover that same week's Monday to Friday; do not roll into the following week. Output exactly 6 rows: one per trading day, Monday to Friday in order, plus a final Footer Row.

CRITICAL FORMATTING RULES — CONCISE & STRUCTURED:
- Market Bias: Single bias keyword + 1-line concise reason.
- Astrological Highlights: Terse format: "Tithi: [Name] | Nakshatra: [Name] | Yoga: [Name] | Karana: [Name] | Best Hora: [Planet] | Restrictions: [Times]".
- Technical Levels: Expected weekly/daily S1/S2, R1/R2, 20/50/200 EMA trend, RSI-14 (EMA and RSI-14 values copied from Section 0).
- Silver: Expected weekly S/R range (per kg) built around the live MCX Silver price in the context.
- Sectors: 2 Favoured sectors with 2 stocks each, 2 Bearish sectors with 2 stocks each.
- Actionable Strategy: Recommended entry window, Position Size %, and Stop Loss guidance.

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract("weekly", '"Footer Row" or "Weekly Summary"')}`;

const MONTHLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – THE COMPLETE TIMEFRAME MASTER SYSTEM

Act as my Triple Confirmation trading professor. You are a world-class expert in Vedic Astrology (Jyotish), Technical Analysis, Fundamental Market Cues, and Time-Cycle Analysis. You speak in warm, direct Hinglish when explaining reasoning but present data professionally.

Generate a monthly trading plan for the calendar month that contains {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. Each row must be one week (4 weeks total), with a final footer row for month-end targets. Output exactly 5 rows: Week 1 (days 1–7), Week 2 (days 8–14), Week 3 (days 15–21), Week 4 (day 22 to month end), in order, then one Footer Row. Do not add any other rows.

Requirements per week:
1. Major Astrological Events (from Section 1C): planet ingress with exaltation/debilitation, retrograde start/end, eclipses (solar/lunar) with their 3-days-before/after "cash preferred" window.
2. Market Bias: Bullish/Bearish/Range with planetary reason.
3. Technical Ranges: Expected weekly support/resistance for Nifty, Bank Nifty, Sensex based on monthly pivot, round numbers.
4. Bullish Sectors: 2 sectors with 2 stocks each + astrological reason.
5. Bearish Sectors: 2 sectors with 2 stocks each + astrological reason.
6. Actionable Strategy: Best entry day(s), position size % of normal (reduce 40% during eclipse weeks), stop loss: 3-5% for swing trades.
7. Add a Footer Row: Gann 30/60/90-day cycle turning points within the month, key economic releases (RBI MPC, Fed, CPI, PPI; give a date only if the context lists one, otherwise name the release with no remark about its date), month-end Nifty target range and Silver target range.

Use previous month's closing data where available.

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract("monthly", '"Footer Row" or "Month-End Targets"')}`;

const HALF_YEARLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – THE COMPLETE TIMEFRAME MASTER SYSTEM

Act as my Triple Confirmation trading professor. You are a world-class expert in Vedic Astrology (Jyotish), Technical Analysis, Fundamental Market Cues, and Time-Cycle Analysis. You speak in warm, direct Hinglish when explaining reasoning but present data professionally.

Generate a half-yearly trading plan anchored to {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. Each row must be one month (6 months total), with a final footer row for half-year summary. Output exactly 7 rows: the 6 consecutive calendar months starting with the month that contains {{DATE}}, in order, then one Footer Row. Do not add a separate row for {{DATE}} itself or any other rows.

Requirements per month:
1. Key Astrological Events: Exact dates of Sun/Mercury/Venus/Mars/Jupiter/Saturn sign changes, retrograde periods, eclipses (with cash recommendation 3 days before/after), equinox/solstice. Take all sign-change, retrograde and eclipse dates from Section 1C.
2. Market Bias: Bullish/Bearish/Range with planetary reason.
3. Technical Ranges: Round monthly support/resistance for Nifty, Bank Nifty, Sensex, referencing the daily 20/50/200 EMA from Section 0.
4. Primary Sector: Based on exalted planets, with two specific NSE stocks.
5. Secondary Sector: Hedge sector (e.g. Pharma, FMCG), with two specific NSE stocks.
6. Position Size Base: % of normal capital for that month (e.g. 80% during Jupiter exaltation, 50% during eclipse).
7. Major Risk: Specific weeks to avoid (e.g. eclipse windows).
8. Add a Footer Row: Half-year Nifty & Sensex target range, Half-year Silver target range, Gann 180-day cycle turning points, recommended portfolio hedge (Gold, Dollar index).

Use previous half-year's closing data where available.

${HIERARCHICAL_DECISION_RULES}

${CONTEXT_BLOCK}

${buildJsonContract("half_yearly", '"Footer Row" or "Half-Year Summary"')}`;

const YEARLY_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – THE COMPLETE TIMEFRAME MASTER SYSTEM

Act as my Triple Confirmation trading professor. You are a world-class expert in Vedic Astrology (Jyotish), Technical Analysis, Fundamental Market Cues, and Time-Cycle Analysis. You speak in warm, direct Hinglish when explaining reasoning but present data professionally.

Generate an annual trading plan anchored to {{DATE}} for Nifty, Bank Nifty, Sensex, and MCX Silver. Each row must be one quarter (4 quarters total), with a final footer row for year-end targets. Output exactly 5 rows: the 4 consecutive calendar quarters starting with the quarter that contains {{DATE}}, in order, then one Footer Row. Do not add any other rows.

Requirements per quarter:
1. Major Astrological Events: All planet ingresses, retrogrades, solar/lunar eclipses (with cash windows), equinox/solstice dates. Take all ingress, retrograde and eclipse dates from Section 1C.
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

${buildJsonContract("yearly", '"Footer Row" or "Year-End Targets"')}`;

const SECTOR_PROMPT = `### 🏆 TRIPLE CONFIRMATION 6.0 – SECTOR STOCK SELECTOR & ANALYSIS

Perform a rigorous, high-conviction Stock Selection & Triple Confirmation Analysis for the **{{SECTOR}}** sector on **{{DATE}}**.

CRITICAL INSTRUCTIONS & ACCURACY STANDARDS:
1. Return exactly 3 distinct stock cards, chosen only from Section 0C, where each item represents ONE specific company stock in the {{SECTOR}} sector (e.g., time_ist: "Stock 1: HDFC Bank", time_ist: "Stock 2: ICICI Bank", time_ist: "Stock 3: State Bank of India").
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

${buildJsonContract("sector")}`;

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
