import "server-only";

import { classifyName, NAKSHATRA_CATEGORIES, RESPONSE_SHAPES, YOGA_CATEGORIES } from "@/lib/prompts";

interface ExaSearchResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
};
const FETCH_TIMEOUT_MS = 10000;
// New Delhi, so every Drik Panchang timing is in IST.
const DRIK_GEONAME_ID = "1273294";

function buildMoneycontrolQuery(date: string, period: string, sector?: string): string {
  if (period === "sector") {
    const sectorName = sector ?? "Banking";
    return `site:screener.in/company/ OR site:moneycontrol.com/india/stockpricequote/ NSE ${sectorName} sector top stocks CMP Rs P/E 20 EMA RSI`;
  }
  return `Nifty 50 Bank Nifty Sensex MCX Silver closing price support resistance levels ${date} site:moneycontrol.com OR site:economictimes.indiatimes.com OR site:nseindia.com`;
}

function buildEconomicTimesQuery(date: string, period: string, sector?: string): string {
  if (period === "sector") {
    const sectorName = sector ?? "Banking";
    return `site:economictimes.indiatimes.com OR site:screener.in NSE ${sectorName} stocks performance volume 20 EMA RSI price`;
  }
  return `Nifty Bank Nifty Sensex live price today ${date} site:economictimes.indiatimes.com OR site:moneycontrol.com`;
}

function getDrikUrl(path: string, date: string): string {
  // Drik expects DD/MM/YYYY
  const parts = date.split("-");
  const drikDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
  return `https://www.drikpanchang.com/${path}?date=${encodeURIComponent(drikDate)}&geoname-id=${DRIK_GEONAME_ID}`;
}

// "2026-10-15" -> "October 15, 2026", the heading Drik prints for that date.
function toLongDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

// Keeps cell and row boundaries as line breaks so each label stays next to its value.
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/tr|\/td|\/th|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#9432;/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ ?\n[ \n]*/g, "\n")
    .trim();
}

function getExaKeys(): string[] {
  const keys = [process.env.EXA_API_KEY, process.env.EXA_FALLBACK_API_KEY];
  return [...new Set(keys.filter((key): key is string => Boolean(key)))];
}

// Tries each Exa key in turn; returns null when every key fails (e.g. 402 out of credits).
async function callExa(endpoint: "search" | "contents", body: object): Promise<ExaSearchResponse | null> {
  for (const apiKey of getExaKeys()) {
    try {
      const res = await fetch(`https://api.exa.ai/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });

      if (res.ok) {
        return (await res.json()) as ExaSearchResponse;
      }

      console.warn(`Exa ${endpoint} failed with status ${res.status}.`);
    } catch (error) {
      console.warn(`Exa ${endpoint} error`, error);
    }
  }

  return null;
}

function searchMarket(query: string, numResults = 3): Promise<ExaSearchResponse | null> {
  return callExa("search", {
    query,
    type: "auto",
    numResults,
    contents: { text: { maxCharacters: 2500 } }
  });
}

interface FetchedPage {
  text: string;
  // Only present for a direct fetch; Exa returns text alone.
  html?: string;
}

// Fetches a page directly (freshest), falling back to Exa's live crawl. `mustInclude` rejects a page
// that is not for the requested date or instrument.
async function fetchPage(url: string, mustInclude: string): Promise<FetchedPage | null> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.ok) {
      const html = await res.text();
      const text = htmlToText(html);
      if (text.includes(mustInclude)) {
        return { text, html };
      }
    }
  } catch (error) {
    console.warn(`Direct fetch failed for ${url}`, error);
  }

  const payload = await callExa("contents", { urls: [url], text: true, livecrawl: "preferred" });
  const text = payload?.results?.[0]?.text?.trim();
  return text && text.includes(mustInclude) ? { text } : null;
}

export async function fetchPageText(url: string, mustInclude: string): Promise<string | null> {
  return (await fetchPage(url, mustInclude))?.text ?? null;
}

// Drik lays timings out as rows of [key, value, key, value] cells, and an empty key continues the key
// above it in the same column (e.g. Thursday's second Dur Muhurtam window sits on Varjyam's row), so
// flattening the page to text misattributes values. Returns each key with all of its values.
function parseDrikTables(html: string): Map<string, string[]> {
  const entries = new Map<string, string[]>();
  const lastKeyByColumn: string[] = [];

  for (const row of html.split('<div class="dpTableRow">').slice(1)) {
    let column = 0;
    let key = "";
    for (const [, kind, content] of row.matchAll(
      /<div class="dpTableCell (dpTableKey|dpTableValue)[^"]*">([\s\S]*?)<\/div>/g
    )) {
      const text = htmlToText(content).replace(/\s+/g, " ").trim();
      if (kind === "dpTableKey") {
        key = text || lastKeyByColumn[column] || "";
        lastKeyByColumn[column] = key;
      } else {
        if (key && text) {
          entries.set(key, [...(entries.get(key) ?? []), text]);
        }
        column++;
      }
    }
  }

  return entries;
}

// e.g. "Nakshatra: Jyeshtha = 🔴 Bearish (upto Full Night) | Yoga: Saubhagya = GOOD (upto 09:15 PM), then Shobhana = BEST"
function describeCategories(panchang: Map<string, string[]>): string {
  const describe = (key: string, categories: typeof YOGA_CATEGORIES) =>
    (panchang.get(key) ?? [])
      .map((value) => {
        const [name, until] = value.split(/\s+upto\s+/);
        const category = classifyName(name.trim(), categories) ?? "not in matrix";
        return `${name.trim()} = ${category}${until ? ` (upto ${until.trim()})` : ""}`;
      })
      .join(", then ");
  return `Triple Confirmation categories (computed from the matrix): Nakshatra: ${describe("Nakshatra", NAKSHATRA_CATEGORIES) || "unavailable"} | Yoga: ${describe("Yoga", YOGA_CATEGORIES) || "unavailable"}`;
}

// The Sunrise..Notes block holds every Panchang element; the rest of the page is navigation.
function extractPanchangCore(text: string): string {
  const start = text.search(/Sunrise\s+\d{1,2}:\d{2}\s*[AP]M/);
  if (start < 0) {
    return text.slice(0, 6000);
  }
  const end = text.indexOf("Notes", start);
  return text.slice(start, end > start ? end : start + 6000);
}

function toMinutes(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*([AP]M)?/);
  if (!match) {
    return Number.NaN;
  }
  const [, hours, minutes, meridiem] = match;
  const hour24 = meridiem ? (Number(hours) % 12) + (meridiem === "PM" ? 12 : 0) : Number(hours);
  return hour24 * 60 + Number(minutes);
}

interface TimeWindow {
  label: string;
  from: string;
  to: string;
  start: number;
  end: number;
}

const TIME_RANGE = /(\d{1,2}:\d{2}\s*[AP]M)\s*to\s*(\d{1,2}:\d{2}\s*[AP]M)/g;
const AVOID_KEYS = ["Rahu Kalam", "Yamaganda", "Gulikai Kalam", "Dur Muhurtam", "Varjyam"];
const FAVOUR_KEYS = ["Abhijit", "Vijaya Muhurta", "Amrit Kalam"];

function toWindows(label: string, value: string): TimeWindow[] {
  return [...value.matchAll(TIME_RANGE)].map(([, from, to]) => ({
    label,
    from,
    to,
    start: toMinutes(from),
    end: toMinutes(to)
  }));
}

function parseDayHoras(horaText: string): TimeWindow[] {
  const start = horaText.indexOf("Day Hora");
  if (start < 0) {
    return [];
  }
  const end = horaText.indexOf("Night Hora", start);
  const daySection = horaText.slice(start, end > start ? end : undefined);
  return [
    ...daySection.matchAll(
      /(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn)\s*-\s*\w+\s+(\d{1,2}:\d{2}\s*[AP]M)\s+to\s+(\d{1,2}:\d{2}\s*[AP]M)/g
    )
  ].map(([, planet, from, to]) => ({ label: planet, from, to, start: toMinutes(from), end: toMinutes(to) }));
}

// One line per intraday slot with every hora and muhurta window overlapping it, e.g.
// "11:36-12:08 | Hora: Moon (11:09 AM-12:07 PM), Saturn (12:07 PM-01:04 PM) | Inauspicious: Varjyam (10:17 AM-12:04 PM) | Auspicious: Abhijit (11:44 AM-12:30 PM)".
function buildSlotTimings(horas: TimeWindow[], panchang: Map<string, string[]> | null): string | null {
  const windowsFor = (keys: string[]) =>
    keys.flatMap((key) => (panchang?.get(key) ?? []).flatMap((value) => toWindows(key, value)));
  const avoid = windowsFor(AVOID_KEYS);
  const favour = windowsFor(FAVOUR_KEYS);

  if (horas.length < 8 && avoid.length === 0) {
    return null;
  }

  const describe = (windows: TimeWindow[], start: number, end: number) => {
    const overlapping = windows.filter((window) => window.start < end && window.end > start);
    return overlapping.length > 0
      ? overlapping.map((window) => `${window.label} (${window.from}-${window.to})`).join(", ")
      : "none";
  };

  return RESPONSE_SHAPES.daily.rowNames
    .filter((name) => name.startsWith("slot_"))
    .map((name) => {
      const [, from, to] = name.split("_");
      const slotFrom = `${from.slice(0, 2)}:${from.slice(2)}`;
      const slotTo = `${to.slice(0, 2)}:${to.slice(2)}`;
      const start = toMinutes(slotFrom);
      const end = toMinutes(slotTo);
      const parts = [`${slotFrom}-${slotTo}`];
      if (horas.length >= 8) {
        parts.push(`Hora: ${describe(horas, start, end)}`);
      }
      if (panchang) {
        parts.push(`Inauspicious: ${describe(avoid, start, end)}`, `Auspicious: ${describe(favour, start, end)}`);
      }
      return parts.join(" | ");
    })
    .join("\n");
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SUMMARY_KEYS = ["Tithi", "Nakshatra", "Yoga", "Karana", ...AVOID_KEYS, "Abhijit"];
const MARKET_OPEN = toMinutes("09:15");
const MARKET_CLOSE = toMinutes("15:30");

// Monday-Friday of the week containing the date.
function tradingWeek(date: string): string[] {
  const day = new Date(`${date}T00:00:00Z`);
  const monday = day.getTime() - ((day.getUTCDay() + 6) % 7) * 86400000;
  return WEEKDAYS.map((_, i) => new Date(monday + i * 86400000).toISOString().slice(0, 10));
}

// One line per weekday: key Panchang elements, their matrix categories and the horas during market hours.
async function describeWeekday(day: string, weekday: string): Promise<string> {
  const longDate = toLongDate(day);
  const [page, horaText] = await Promise.all([
    fetchPage(getDrikUrl("panchang/day-panchang.html", day), longDate),
    fetchPageText(getDrikUrl("muhurat/hora.html", day), longDate)
  ]);
  const table = page?.html ? parseDrikTables(page.html) : null;
  if (!table || table.size === 0) {
    return `${weekday} ${day}: ${page ? extractPanchangCore(page.text).slice(0, 1500) : "Drik Panchang could not be fetched"}`;
  }

  const parts = DAY_SUMMARY_KEYS.filter((key) => table.has(key)).map((key) => `${key}: ${table.get(key)?.join("; ")}`);
  parts.push(describeCategories(table));
  const horas = horaText ? parseDayHoras(horaText).filter((hora) => hora.start < MARKET_CLOSE && hora.end > MARKET_OPEN) : [];
  if (horas.length > 0) {
    parts.push(`Market-hours horas: ${horas.map((hora) => `${hora.label} ${hora.from}-${hora.to}`).join(", ")}`);
  }
  return `${weekday} ${day}: ${parts.join(" | ")}`;
}

function formatSearchResults(payload: ExaSearchResponse | null, label: string): string[] {
  return (payload?.results ?? []).map((result, index) => {
    const title = result.title?.trim() || `${label} Quote`;
    const published = result.publishedDate ? ` | published ${result.publishedDate.slice(0, 10)}` : "";
    const text = result.text?.replace(/\s+/g, " ").trim().slice(0, 2500) || "";
    return `[${label} ${index + 1}: ${title}${published} | ${result.url ?? ""}]\n${text}`;
  });
}

export async function getExaWebContext(
  date: string,
  period: string,
  sector?: string
): Promise<string> {
  if (!process.env.EXA_API_KEY) {
    throw new Error("EXA_API_KEY is not configured.");
  }

  const longDate = toLongDate(date);
  const drikUrl = getDrikUrl("panchang/day-panchang.html", date);
  const horaUrl = getDrikUrl("muhurat/hora.html", date);

  const [panchangPage, horaText, weekLines, mcPayload, etPayload] = await Promise.all([
    period === "weekly" ? Promise.resolve(null) : fetchPage(drikUrl, longDate),
    period === "daily" ? fetchPageText(horaUrl, longDate) : Promise.resolve(null),
    period === "weekly"
      ? Promise.all(tradingWeek(date).map((day, i) => describeWeekday(day, WEEKDAYS[i])))
      : Promise.resolve(null),
    searchMarket(buildMoneycontrolQuery(date, period, sector)),
    searchMarket(buildEconomicTimesQuery(date, period, sector))
  ]);

  const panchang = panchangPage?.html ? parseDrikTables(panchangPage.html) : null;
  const contextParts: string[] = [];

  if (weekLines) {
    contextParts.push(
      "### 1W. DRIK PANCHANG FOR EACH TRADING DAY (India / IST; Source: drikpanchang.com day panchang and hora pages):",
      weekLines.join("\n")
    );
  } else {
    let panchangBlock =
      'UNAVAILABLE: Drik Panchang could not be fetched for this date. Do not state any Panchang element or timing; write "Panchang unavailable".';
    if (panchang && panchang.size > 0) {
      const lines = [...panchang].map(([key, values]) => `${key}: ${values.join("; ")}`);
      panchangBlock = `${describeCategories(panchang)}\n${lines.join("\n")}`.slice(0, 6000);
    } else if (panchangPage) {
      panchangBlock = extractPanchangCore(panchangPage.text).slice(0, 6000);
    }
    contextParts.push(`### 1. OFFICIAL DRIK PANCHANG (India / IST) FOR ${date} (Source: ${drikUrl}):`, panchangBlock);
  }

  const slotTimings =
    period === "daily" ? buildSlotTimings(horaText ? parseDayHoras(horaText) : [], panchang) : null;
  if (slotTimings) {
    contextParts.push(
      `\n### 1B. HORA & MUHURTA BY TRADING SLOT (computed from Drik Panchang; Source: ${horaUrl}):\n${slotTimings}`
    );
  }

  const mcResults = formatSearchResults(mcPayload, "Moneycontrol");
  if (mcResults.length > 0) {
    contextParts.push(`\n### 2. FINANCIAL SOURCE A (Moneycontrol - News, Cues & Levels) FOR ${date}:`, ...mcResults);
  }

  const etResults = formatSearchResults(etPayload, "Economic Times");
  if (etResults.length > 0) {
    contextParts.push(`\n### 3. FINANCIAL SOURCE B (Economic Times - Verification & Commodities) FOR ${date}:`, ...etResults);
  }

  return contextParts.join("\n\n");
}
