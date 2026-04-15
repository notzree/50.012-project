import OpenAI from "openai";
import { BenchmarkProvider, ProviderConfig } from "./index";
import { BenchmarkEvent, BenchmarkMetrics } from "../metrics";

export class OpenAIProvider implements BenchmarkProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async *stream(prompt: string): AsyncGenerator<BenchmarkEvent> {
    const client = new OpenAI({ apiKey: process.env[this.config.envKey] });
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
        stream_options: { include_usage: true },
      });

      for await (const chunk of response) {
        const elapsed = performance.now() - start;
        const content = chunk.choices[0]?.delta?.content;

        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0;
        }

        if (content) {
          if (firstChunkTime === null) firstChunkTime = elapsed;
          const tokenCount = Math.ceil(content.length / 4);
          totalTokens += tokenCount;

          yield { type: "chunk", content, tokenCount, elapsed };
        }
      }

      const totalLatency = performance.now() - start;
      const metrics: BenchmarkMetrics = {
        provider: this.config.name,
        model: this.config.model,
        tps: totalTokens / (totalLatency / 1000),
        ttfb: firstChunkTime ?? totalLatency,
        totalLatency,
        outputTokens: totalTokens,
        inputTokens,
        timestamp: Date.now(),
      };

      yield { type: "complete", metrics };
    } catch (err) {
      yield { type: "error", error: err instanceof Error ? err.message : String(err) };
    }
  }
}
