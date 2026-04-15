import { GoogleGenerativeAI } from "@google/generative-ai";
import { BenchmarkProvider, ProviderConfig } from "./index";
import { BenchmarkEvent, BenchmarkMetrics } from "../metrics";

export class GoogleProvider implements BenchmarkProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async *stream(prompt: string, apiKey: string): AsyncGenerator<BenchmarkEvent> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: this.config.model });
    const start = performance.now();
    let firstChunkTime: number | null = null;
    let totalTokens = 0;
    let inputTokens = 0;
    let cachedContentTokens = 0;

    yield { type: "start", provider: this.config.name, model: this.config.model };

    try {
      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const elapsed = performance.now() - start;
        const content = chunk.text();

        const usage = chunk.usageMetadata;
        if (usage) {
          inputTokens = usage.promptTokenCount ?? inputTokens;
          totalTokens = usage.candidatesTokenCount ?? totalTokens;
          cachedContentTokens =
            (usage as unknown as Record<string, number>).cachedContentTokenCount ?? cachedContentTokens;
        }

        if (content) {
          if (firstChunkTime === null) firstChunkTime = elapsed;
          const tokenCount = Math.ceil(content.length / 4);
          totalTokens += tokenCount;

          yield { type: "chunk", content, tokenCount, elapsed };
        }
      }

      const totalLatency = performance.now() - start;
      let cacheStatus: "hit" | "miss" | "unknown" = "unknown";
      if (inputTokens > 0) {
        cacheStatus = cachedContentTokens > 0 ? "hit" : "miss";
      }

      const metrics: BenchmarkMetrics = {
        provider: this.config.name,
        model: this.config.model,
        tps: totalTokens / (totalLatency / 1000),
        ttfb: firstChunkTime ?? totalLatency,
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
