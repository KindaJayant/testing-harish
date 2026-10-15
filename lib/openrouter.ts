import "server-only";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
  };
}

export async function runOpenRouterAnalysis(
  prompt: string,
  schema: Record<string, unknown>
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  if (!model) {
    throw new Error("OPENROUTER_MODEL is not configured.");
  }

  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content:
        "You are a precise Triple Confirmation astro-financial trading professor. Follow the output contract exactly and return raw JSON only."
    },
    {
      role: "user",
      content: prompt
    }
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://tradewise.local",
      "X-Title": "TRADEWISE"
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "analysis_rows", strict: true, schema }
      },
      temperature: 0.0,
      top_p: 1.0,
      seed: 42,
      max_tokens: 12000,
      // Claude reasons by default and reasoning tokens count against max_tokens, which left
      // claude-haiku-5.5's Daily response empty or truncated. Gemini 3.x rejects disabling it.
      ...(model.startsWith("anthropic/") ? { reasoning: { enabled: false } } : {})
    }),
    cache: "no-store"
  });

  const payload = (await response.json()) as OpenRouterResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenRouter request failed.");
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return content;
}
