import "server-only";

import { fetchPageText } from "@/lib/exa";
import { SECTOR_STOCKS, type Sector } from "@/lib/markets";

// Exact index and stock levels and indicators computed from exchange closes, plus the MCX Silver quote
// parsed into labelled fields, so the model copies numbers instead of reading them out of news snippets.

interface YahooChart {
  chart?: {
    result?: Array<{
      meta: { regularMarketPrice?: number; regularMarketTime?: number };
      timestamp?: number[];
      indicators: { quote: Array<{ close?: Array<number | null>; volume?: Array<number | null> }> };
    }>;
  };
}

interface Snapshot {
  previous: { day: string; close: number };
  closes: number[];
  volumes: number[];
  live: string | null;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;
const INDICES = [
  { name: "Nifty 50", symbol: "^NSEI" },
  { name: "Bank Nifty", symbol: "^NSEBANK" },
  { name: "Sensex", symbol: "^BSESN" }
];
const MCX_SILVER_URL = "https://economictimes.indiatimes.com/commoditysummary/symbol-SILVER.cms";

// IST wall-clock time as "YYYY-MM-DDTHH:MM:SS..."
function toIst(epochMs: number): string {
  return new Date(epochMs + IST_OFFSET_MS).toISOString();
}

function formatInr(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function ema(closes: number[], period: number): number | null {
  if (closes.length < period) {
    return null;
  }
  const k = 2 / (period + 1);
  let value = closes.slice(0, period).reduce((sum, close) => sum + close, 0) / period;
  for (const close of closes.slice(period)) {
    value = close * k + value * (1 - k);
  }
  return value;
}

// Wilder's RSI.
function rsi(closes: number[], period = 14): number | null {
  if (closes.length <= period) {
    return null;
  }
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(change, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-change, 0)) / period;
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}

async function loadSnapshot(symbol: string, date: string): Promise<Snapshot> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
  );
  if (!res.ok) {
    throw new Error(`Yahoo returned ${res.status} for ${symbol}`);
  }
  const result = ((await res.json()) as YahooChart).chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators.quote[0];

  const nowIst = toIst(Date.now());
  const todayIst = nowIst.slice(0, 10);
  const marketClosed = nowIst.slice(11, 16) >= "15:30";

  // Completed sessions before the plan date; today's bar only counts once the market has closed.
  const sessions = timestamps
    .map((timestamp, i) => ({
      day: toIst(timestamp * 1000).slice(0, 10),
      close: quote?.close?.[i],
      volume: quote?.volume?.[i] ?? 0
    }))
    .filter(
      (session): session is { day: string; close: number; volume: number } =>
        typeof session.close === "number" && session.day < date && (session.day < todayIst || marketClosed)
    );
  const last = sessions.at(-1);
  if (!last) {
    throw new Error(`no completed sessions for ${symbol} before ${date}`);
  }

  let live: string | null = null;
  const livePrice = result?.meta.regularMarketPrice;
  const liveTime = result?.meta.regularMarketTime;
  if (date >= todayIst && livePrice && liveTime && toIst(liveTime * 1000).slice(0, 10) === todayIst && last.day !== todayIst) {
    const label = marketClosed ? "today's close" : "live";
    live = `${label} ${formatInr(livePrice)} (${formatPercent(((livePrice - last.close) / last.close) * 100)}) as of ${toIst(liveTime * 1000).slice(11, 16)} IST`;
  }

  return {
    previous: { day: last.day, close: last.close },
    closes: sessions.map((session) => session.close),
    volumes: sessions.map((session) => session.volume),
    live
  };
}

function describeSnapshot(snapshot: Snapshot, emaPeriods: number[]): string[] {
  const { previous, closes } = snapshot;
  const parts = [`previous close ${formatInr(previous.close)} (${previous.day})`];
  if (snapshot.live) {
    parts.push(snapshot.live);
  }
  for (const period of emaPeriods) {
    const value = ema(closes, period);
    if (value !== null) {
      parts.push(`${period} EMA ${formatInr(Math.round(value * 100) / 100)}`);
    }
  }
  const rsiValue = rsi(closes);
  if (rsiValue !== null) {
    parts.push(`RSI-14 ${rsiValue.toFixed(1)}`);
  }
  // ~21 sessions = one month
  if (closes.length > 21) {
    parts.push(`1M return ${formatPercent((closes[closes.length - 1] / closes[closes.length - 22] - 1) * 100)}`);
  }
  return parts;
}

// Last completed session's volume against the average of the 20 sessions before it.
function volumeRatio(volumes: number[]): number | null {
  const latest = volumes.at(-1);
  const prior = volumes.slice(-21, -1).filter((volume) => volume > 0);
  if (!latest || prior.length < 10) {
    return null;
  }
  return latest / (prior.reduce((sum, volume) => sum + volume, 0) / prior.length);
}

async function describeIndex(name: string, symbol: string, date: string): Promise<string> {
  try {
    return `${name}: ${describeSnapshot(await loadSnapshot(symbol, date), [20, 50, 200]).join(" | ")}`;
  } catch (error) {
    console.warn(`Index data for ${symbol} failed`, error);
    return `${name}: unavailable`;
  }
}

async function describeStock(name: string, symbol: string, date: string): Promise<string | null> {
  try {
    const snapshot = await loadSnapshot(`${symbol}.NS`, date);
    const parts = describeSnapshot(snapshot, [20, 50]);
    const ratio = volumeRatio(snapshot.volumes);
    if (ratio !== null) {
      parts.push(`volume ${ratio.toFixed(2)}x its 20-day average (${snapshot.previous.day})`);
    }
    return `${name} (NSE: ${symbol}): ${parts.join(" | ")}`;
  } catch (error) {
    // Leave the stock out rather than show it without numbers.
    console.warn(`Stock data for ${symbol} failed`, error);
    return null;
  }
}

function matchNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

async function describeMcxSilver(date: string): Promise<string> {
  const text = await fetchPageText(MCX_SILVER_URL, "Per 1 KGS");
  const ltp = text ? matchNumber(text, /([\d,]+(?:\.\d+)?)\s*Per 1 KGS/) : null;
  const prevClose = text ? matchNumber(text, /Prv\.?\s*Close\s*-?\s*([\d,]+(?:\.\d+)?)/) : null;

  if (!text || ltp === null || prevClose === null) {
    return "MCX Silver: unavailable";
  }

  const quote = text.slice(text.search(/Per 1 KGS/));
  const expiry = text.match(/Expiry:\s*(\d{2}-[A-Za-z]{3}-\d{4})/)?.[1];
  const asOf = text.match(/(\d{1,2}\.\d{2}\s*[AP]M IST\s*\|\s*\d{1,2} \w{3}, \d{4})/)?.[1];
  const open = matchNumber(quote, /Open\s*-?\s*([\d,]+(?:\.\d+)?)/);
  const dayRange = quote.match(/Day:\s*([\d,]+(?:\.\d+)?)\s*-?\s*([\d,]+(?:\.\d+)?)/);
  const contractRange = quote.match(/Contract:\s*([\d,]+(?:\.\d+)?)\s*-?\s*([\d,]+(?:\.\d+)?)/);
  const range = (match: RegExpMatchArray) =>
    `${formatInr(Number(match[1].replace(/,/g, "")))}-${formatInr(Number(match[2].replace(/,/g, "")))}`;

  const parts = [
    `LTP Rs ${formatInr(ltp)}/kg (${formatPercent(((ltp - prevClose) / prevClose) * 100)})`,
    `previous close ${formatInr(prevClose)}`
  ];
  if (open !== null) {
    parts.push(`open ${formatInr(open)}`);
  }
  if (dayRange) {
    parts.push(`day range ${range(dayRange)}`);
  }
  if (contractRange) {
    parts.push(`contract lifetime range ${range(contractRange)} (NOT a support/resistance level)`);
  }

  const todayIst = toIst(Date.now()).slice(0, 10);
  const note = date < todayIst ? ` (current quote; MCX data for ${date} itself is not published)` : "";
  return `MCX Silver${expiry ? ` ${expiry} contract` : ""}${asOf ? `, quoted ${asOf}` : ""}${note}: ${parts.join(" | ")}`;
}

export async function getMarketDataContext(date: string, period: string, sector?: string): Promise<string> {
  const candidates = period === "sector" && sector ? (SECTOR_STOCKS[sector as Sector] ?? []) : [];

  const [indices, silver, stocks] = await Promise.all([
    Promise.all(INDICES.map(({ name, symbol }) => describeIndex(name, symbol, date))),
    period === "sector" ? Promise.resolve(null) : describeMcxSilver(date),
    Promise.all(candidates.map(({ name, symbol }) => describeStock(name, symbol, date)))
  ]);

  const parts = [
    `### 0. VERIFIED INDEX DATA (Yahoo Finance daily closes; EMA, RSI-14 and 1M return computed from completed sessions before ${date}):`,
    ...indices
  ];
  if (silver) {
    parts.push(`\n### 0B. VERIFIED MCX SILVER QUOTE (Source: ${MCX_SILVER_URL}):`, silver);
  }
  const stockLines = stocks.filter((line): line is string => line !== null);
  if (stockLines.length > 0) {
    parts.push(
      `\n### 0C. VERIFIED STOCK DATA - ${sector} sector candidates (Yahoo Finance NSE daily data; computed from completed sessions before ${date}):`,
      ...stockLines
    );
  }
  return parts.join("\n");
}
