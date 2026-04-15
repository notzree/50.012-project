import { BenchmarkMetrics, BenchmarkEvent } from "../metrics";

export interface ClientBenchmarkCallbacks {
  onEvent: (event: BenchmarkEvent) => void;
}

export interface ClientProviderStreamer {
  (prompt: string, apiKey: string, model: string, signal: AbortSignal, cb: ClientBenchmarkCallbacks): Promise<void>;
}

const CORS_PROVIDERS: Record<string, boolean> = {
  openai: true,
  google: true,
  groq: true,
  anthropic: false,
};

export function supportsClientSide(providerId: string): boolean {
  return CORS_PROVIDERS[providerId] === true;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function parseSSEStream(
  response: Response,
  extractContent: (parsed: Record<string, unknown>) => string | null,
  extractUsage: (parsed: Record<string, unknown>) => { inputTokens?: number; cachedTokens?: number } | null,
  providerName: string,
  model: string,
  start: number,
  cb: ClientBenchmarkCallbacks
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let firstChunkTime: number | null = null;
  let totalTokens = 0;
  let inputTokens = 0;
  let cachedTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const content = extractContent(parsed);
        const usage = extractUsage(parsed);

        if (usage) {
          if (usage.inputTokens != null) inputTokens = usage.inputTokens;
          if (usage.cachedTokens != null) cachedTokens = usage.cachedTokens;
        }

        if (content) {
          const elapsed = performance.now() - start;
          if (firstChunkTime === null) firstChunkTime = elapsed;
          const tokenCount = estimateTokens(content);
          totalTokens += tokenCount;
          cb.onEvent({ type: "chunk", content, tokenCount, elapsed });
        }
      } catch {
        // skip unparseable lines
      }
    }
  }

  const totalLatency = performance.now() - start;
  let cacheStatus: "hit" | "miss" | "unknown" = "unknown";
  if (inputTokens > 0) {
    cacheStatus = cachedTokens > 0 ? "hit" : "miss";
  }

  const metrics: BenchmarkMetrics = {
    provider: providerName,
    model,
    tps: totalTokens / (totalLatency / 1000),
    ttfb: firstChunkTime ?? totalLatency,
    totalLatency,
    outputTokens: totalTokens,
    inputTokens,
    cacheStatus,
    timestamp: Date.now(),
  };

  cb.onEvent({ type: "complete", metrics });
}

export const clientStreamOpenAI: ClientProviderStreamer = async (prompt, apiKey, model, signal, cb) => {
  const start = performance.now();
  cb.onEvent({ type: "start", provider: "OpenAI", model });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
    }

    await parseSSEStream(
      response,
      (parsed) => {
        const choices = parsed.choices as Array<{ delta?: { content?: string } }> | undefined;
        return choices?.[0]?.delta?.content || null;
      },
      (parsed) => {
        const usage = parsed.usage as Record<string, unknown> | undefined;
        if (!usage) return null;
        const details = usage.prompt_tokens_details as Record<string, number> | undefined;
        return {
          inputTokens: usage.prompt_tokens as number | undefined,
          cachedTokens: details?.cached_tokens,
        };
      },
      "OpenAI",
      model,
      start,
      cb
    );
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      cb.onEvent({ type: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }
};

export const clientStreamGoogle: ClientProviderStreamer = async (prompt, apiKey, model, signal, cb) => {
  const start = performance.now();
  cb.onEvent({ type: "start", provider: "Google Gemini", model });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let firstChunkTime: number | null = null;
    let totalTokens = 0;
    let inputTokens = 0;
    let cachedTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);

        try {
          const parsed = JSON.parse(data);
          const candidates = parsed.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
          const text = candidates?.[0]?.content?.parts?.[0]?.text;

          const usage = parsed.usageMetadata;
          if (usage) {
            inputTokens = usage.promptTokenCount ?? inputTokens;
            if (usage.candidatesTokenCount) totalTokens = usage.candidatesTokenCount;
            cachedTokens = usage.cachedContentTokenCount ?? cachedTokens;
          }

          if (text) {
            const elapsed = performance.now() - start;
            if (firstChunkTime === null) firstChunkTime = elapsed;
            const tokenCount = estimateTokens(text);
            totalTokens += tokenCount;
            cb.onEvent({ type: "chunk", content: text, tokenCount, elapsed });
          }
        } catch {
          // skip
        }
      }
    }

    const totalLatency = performance.now() - start;
    let cacheStatus: "hit" | "miss" | "unknown" = "unknown";
    if (inputTokens > 0) {
      cacheStatus = cachedTokens > 0 ? "hit" : "miss";
    }

    const metrics: BenchmarkMetrics = {
      provider: "Google Gemini",
      model,
      tps: totalTokens / (totalLatency / 1000),
      ttfb: firstChunkTime ?? totalLatency,
      totalLatency,
      outputTokens: totalTokens,
      inputTokens,
      cacheStatus,
      timestamp: Date.now(),
    };

    cb.onEvent({ type: "complete", metrics });
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      cb.onEvent({ type: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }
};

export const clientStreamGroq: ClientProviderStreamer = async (prompt, apiKey, model, signal, cb) => {
  const start = performance.now();
  cb.onEvent({ type: "start", provider: "Groq", model });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err.error?.message || `Groq API error: ${response.status}`);
    }

    let firstChunkTime: number | null = null;
    let totalTokens = 0;

    await parseSSEStream(
      response,
      (parsed) => {
        const choices = parsed.choices as Array<{ delta?: { content?: string } }> | undefined;
        return choices?.[0]?.delta?.content || null;
      },
      (parsed) => {
        const xGroq = parsed.x_groq as { usage?: Record<string, number> } | undefined;
        if (!xGroq?.usage) return null;
        return { inputTokens: xGroq.usage.prompt_tokens };
      },
      "Groq",
      model,
      start,
      cb
    );
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      cb.onEvent({ type: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }
};

const CLIENT_STREAMERS: Record<string, ClientProviderStreamer> = {
  openai: clientStreamOpenAI,
  google: clientStreamGoogle,
  groq: clientStreamGroq,
};

export function getClientStreamer(providerId: string): ClientProviderStreamer | null {
  return CLIENT_STREAMERS[providerId] ?? null;
}
