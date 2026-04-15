import Anthropic from "@anthropic-ai/sdk";
import { BenchmarkProvider, ProviderConfig } from "./index";
import { BenchmarkEvent, BenchmarkMetrics } from "../metrics";

export class AnthropicProvider implements BenchmarkProvider {
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async *stream(prompt: string): AsyncGenerator<BenchmarkEvent> {
    const client = new Anthropic({ apiKey: process.env[this.config.envKey] });
    const start = performance.now();
    let firstChunkTime: number | null = null;
    let totalTokens = 0;
    let inputTokens = 0;

    yield { type: "start", provider: this.config.name, model: this.config.model };

    try {
      const stream = client.messages.stream({
        model: this.config.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      for await (const event of stream) {
        const elapsed = performance.now() - start;

        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const content = event.delta.text;
          if (firstChunkTime === null) firstChunkTime = elapsed;
          const tokenCount = Math.ceil(content.length / 4);
          totalTokens += tokenCount;

          yield { type: "chunk", content, tokenCount, elapsed };
        }

        if (event.type === "message_delta" && event.usage) {
          totalTokens = event.usage.output_tokens ?? totalTokens;
        }
      }

      const finalMessage = await stream.finalMessage();
      if (finalMessage.usage) {
        inputTokens = finalMessage.usage.input_tokens;
        totalTokens = finalMessage.usage.output_tokens;
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
