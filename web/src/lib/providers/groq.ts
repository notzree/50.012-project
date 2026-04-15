import Groq from "groq-sdk";
import { BenchmarkProvider, ProviderConfig } from "./index";
import { BenchmarkEvent, BenchmarkMetrics } from "../metrics";

const GROQ_CACHE_TTFB_THRESHOLD_MS = 100;

export class GroqProvider implements BenchmarkProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async *stream(prompt: string, apiKey: string): AsyncGenerator<BenchmarkEvent> {
    const client = new Groq({ apiKey });
    const start = performance.now();
    let firstChunkTime: number | null = null;
    let totalTokens = 0;
    let inputTokens = 0;

    yield { type: "start", provider: this.config.name, model: this.config.model };

    try {
      const response = await client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      });

      for await (const chunk of response) {
        const elapsed = performance.now() - start;
        const content = chunk.choices[0]?.delta?.content;

        if (chunk.x_groq?.usage) {
          inputTokens = chunk.x_groq.usage.prompt_tokens ?? inputTokens;
          totalTokens = chunk.x_groq.usage.completion_tokens ?? totalTokens;
        }

        if (content) {
          if (firstChunkTime === null) firstChunkTime = elapsed;
          const tokenCount = Math.ceil(content.length / 4);
          totalTokens += tokenCount;

          yield { type: "chunk", content, tokenCount, elapsed };
        }
      }

      const totalLatency = performance.now() - start;
      const ttfb = firstChunkTime ?? totalLatency;
      const cacheStatus: "hit" | "miss" | "unknown" =
        ttfb < GROQ_CACHE_TTFB_THRESHOLD_MS ? "hit" : "unknown";

      const metrics: BenchmarkMetrics = {
        provider: this.config.name,
        model: this.config.model,
        tps: totalTokens / (totalLatency / 1000),
        ttfb,
        totalLatency,
        outputTokens: totalTokens,
        inputTokens,
        cacheStatus,
        timestamp: Date.now(),
      };

      yield { type: "complete", metrics };
    } catch (err) {
      yield { type: "error", error: err instanceof Error ? err.message : String(err) };
    }
  }
}
