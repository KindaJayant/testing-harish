import "server-only";

interface ExaSearchResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

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

function getDrikPanchangUrl(date: string): string {
  // Format YYYY-MM-DD into DD/MM/YYYY for Drik Panchang URL and lock to Delhi / Indian Standard Time coordinates
  const parts = date.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `https://www.drikpanchang.com/panchang/day-panchang.html?date=${encodeURIComponent(`${d}/${m}/${y}`)}&geoname-id=1273294`;
  }
  return `https://www.drikpanchang.com/panchang/day-panchang.html?date=${encodeURIComponent(date)}&geoname-id=1273294`;
}

async function executeDirectUrlFetch(apiKey: string, url: string): Promise<Response> {
  return fetch("https://api.exa.ai/contents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      urls: [url],
      text: true
    })
  });
}

async function executeMarketSearch(apiKey: string, query: string, numResults = 4): Promise<Response> {
  return fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults,
      contents: {
        text: {
          maxCharacters: 2500
        }
      }
    })
  });
}

export async function getExaWebContext(
  date: string,
  period: string,
  sector?: string
): Promise<string> {
  const primaryKey = process.env.EXA_API_KEY || "8e6ee032-dab5-402b-ba30-d1c5f00f95c3";
  const fallbackKey = process.env.EXA_FALLBACK_API_KEY || "8e6ee032-dab5-402b-ba30-d1c5f00f95c3";

  const drikUrl = getDrikPanchangUrl(date);
  const mcQuery = buildMoneycontrolQuery(date, period, sector);
  const etQuery = buildEconomicTimesQuery(date, period, sector);

  try {
    let panchangRes: Response;
    let mcRes: Response;
    let etRes: Response;

    try {
      [panchangRes, mcRes, etRes] = await Promise.all([
        executeDirectUrlFetch(primaryKey, drikUrl),
        executeMarketSearch(primaryKey, mcQuery, 3),
        executeMarketSearch(primaryKey, etQuery, 3)
      ]);

      if (!panchangRes.ok || !mcRes.ok || !etRes.ok) {
        console.warn(`Primary Exa key failed. Trying fallback key...`);
        [panchangRes, mcRes, etRes] = await Promise.all([
          executeDirectUrlFetch(fallbackKey, drikUrl),
          executeMarketSearch(fallbackKey, mcQuery, 3),
          executeMarketSearch(fallbackKey, etQuery, 3)
        ]);
      }
    } catch (err) {
      console.warn("Primary Exa query error, switching to fallback key...", err);
      [panchangRes, mcRes, etRes] = await Promise.all([
        executeDirectUrlFetch(fallbackKey, drikUrl),
        executeMarketSearch(fallbackKey, mcQuery, 3),
        executeMarketSearch(fallbackKey, etQuery, 3)
      ]);
    }

    if (!panchangRes.ok) {
      throw new Error(`Exa panchang fetch failed with status ${panchangRes.status}`);
    }

    const panchangPayload = (await panchangRes.json()) as ExaSearchResponse;
    const mcPayload = mcRes && mcRes.ok ? ((await mcRes.json()) as ExaSearchResponse) : { results: [] };
    const etPayload = etRes && etRes.ok ? ((await etRes.json()) as ExaSearchResponse) : { results: [] };

    let contextParts: string[] = [];

    const panchangResults = panchangPayload.results ?? [];
    if (panchangResults.length > 0) {
      contextParts.push(`### 1. OFFICIAL DRIK PANCHANG (India / IST) FOR ${date} (Source: ${drikUrl}):`);
      panchangResults.forEach((result) => {
        const text = result.text?.replace(/\s+/g, " ").trim() || "";
        contextParts.push(text.slice(0, 6000));
      });
    }

    const mcResults = mcPayload.results ?? [];
    if (mcResults.length > 0) {
      contextParts.push(`\n### 2. FINANCIAL SOURCE A (Moneycontrol - Prices & Levels) FOR ${date}:`);
      mcResults.forEach((result, index) => {
        const title = result.title?.trim() || "Moneycontrol Quote";
        const text = result.text?.replace(/\s+/g, " ").trim().slice(0, 2500) || "";
        contextParts.push(`[Moneycontrol ${index + 1}: ${title}]\n${text}`);
      });
    }

    const etResults = etPayload.results ?? [];
    if (etResults.length > 0) {
      contextParts.push(`\n### 3. FINANCIAL SOURCE B (Economic Times - Verification & Commodities) FOR ${date}:`);
      etResults.forEach((result, index) => {
        const title = result.title?.trim() || "Economic Times Quote";
        const text = result.text?.replace(/\s+/g, " ").trim().slice(0, 2500) || "";
        contextParts.push(`[Economic Times ${index + 1}: ${title}]\n${text}`);
      });
    }

    if (contextParts.length === 0) {
      return "No fresh web results were returned for this request.";
    }

    return contextParts.join("\n\n");
  } catch (error) {
    console.error("Exa search error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    // If Exa fails, return a graceful fallback string so the analysis does not crash
    return `Note: Web search context fetch encountered an issue (${detail}). Proceeding with standard historical Panchang & technical calculations for ${date}.`;
  }
}
