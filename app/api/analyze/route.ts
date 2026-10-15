import { NextRequest, NextResponse } from "next/server";

import { getExaWebContext } from "@/lib/exa";
import { SECTORS } from "@/lib/markets";
import { runOpenRouterAnalysis } from "@/lib/openrouter";
import { buildPrompt, buildResponseSchema, RESPONSE_SHAPES } from "@/lib/prompts";
import type { AnalysisKind, AnalysisRow, AnalysisResponse } from "@/types/analysis";

export const runtime = "edge";

const MAX_MODEL_ATTEMPTS = 2;

interface AnalyzeRequestBody {
  date?: unknown;
  period?: unknown;
  sector?: unknown;
}

const validAnalysisKinds: AnalysisKind[] = [
  "daily",
  "weekly",
  "monthly",
  "half_yearly",
  "yearly",
  "sector"
];

function isAnalysisKind(value: string): value is AnalysisKind {
  return validAnalysisKinds.includes(value as AnalysisKind);
}

function isSector(value: string): boolean {
  return SECTORS.includes(value as (typeof SECTORS)[number]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnalysisRow(value: unknown): value is AnalysisRow {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((key) => typeof value[key] === "string")
  );
}

function isAnalysisRows(value: unknown): value is AnalysisRow[] {
  return Array.isArray(value) && value.every((row) => isAnalysisRow(row));
}

function stripMarkdownFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "").trim();
}

// The model returns one named property per row (see RESPONSE_SHAPES); flatten it back into ordered rows.
function parseRows(raw: string, rowNames: string[]): AnalysisRow[] | null {
  try {
    const parsed: unknown = JSON.parse(stripMarkdownFences(raw));

    if (!isRecord(parsed)) {
      return null;
    }

    const rows = rowNames.map((name) => parsed[name]);
    return isAnalysisRows(rows) ? rows : null;
  } catch {
    return null;
  }
}

function errorResponse(message: string, status: number): NextResponse<AnalysisResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message
    },
    { status }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResponse>> {
  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const date = typeof body.date === "string" ? body.date.trim() : "";
  const period = typeof body.period === "string" ? body.period.trim() : "";
  const sector = typeof body.sector === "string" ? body.sector.trim() : "";

  if (!date || !period) {
    return errorResponse("Date and period are required.", 400);
  }

  if (!isAnalysisKind(period)) {
    return errorResponse("Invalid period selected.", 400);
  }

  if (period === "sector" && !sector) {
    return errorResponse("Sector is required for stock selection.", 400);
  }

  if (sector && !isSector(sector)) {
    return errorResponse("Invalid sector selected.", 400);
  }

  try {
    const webContext = await getExaWebContext(date, period, sector || undefined);
    const prompt = buildPrompt(period, date, sector, webContext);
    const schema = buildResponseSchema(period);
    const { rowNames } = RESPONSE_SHAPES[period];

    // Structured outputs make bad JSON rare; one silent retry covers the rest.
    for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt++) {
      const rows = parseRows(await runOpenRouterAnalysis(prompt, schema), rowNames);

      if (rows) {
        return NextResponse.json({
          success: true,
          rows
        });
      }
    }

    return errorResponse("The model returned invalid JSON. Please retry.", 502);
  } catch (error: unknown) {
    const knownErrors = new Set([
      "OPENROUTER_API_KEY is not configured.",
      "OPENROUTER_MODEL is not configured.",
      "EXA_API_KEY is not configured.",
      "Exa web search failed."
    ]);

    const message =
      error instanceof Error && knownErrors.has(error.message)
        ? error.message
        : "Unable to generate analysis right now. Please try again.";

    return errorResponse(message, 500);
  }
}
