import { BenchmarkEvent } from "../metrics";
import { PROVIDERS } from "../constants";

export interface ProviderConfig {
  id: string;
  name: string;
  model: string;
  envKey: string;
}

export interface BenchmarkProvider {
  config: ProviderConfig;
  stream(prompt: string): AsyncGenerator<BenchmarkEvent>;
}

export function getProvider(id: string): BenchmarkProvider {
  const config = PROVIDERS.find((p) => p.id === id);
  if (!config) {
    throw new Error(`Unknown provider: ${id}`);
  }

  switch (id) {
    case "openai": {
      const { OpenAIProvider } = require("./openai");
      return new OpenAIProvider(config);
    }
    case "anthropic": {
      const { AnthropicProvider } = require("./anthropic");
      return new AnthropicProvider(config);
    }
    case "google": {
      const { GoogleProvider } = require("./google");
      return new GoogleProvider(config);
    }
    case "groq": {
      const { GroqProvider } = require("./groq");
      return new GroqProvider(config);
    }
    default:
      throw new Error(`No implementation for provider: ${id}`);
  }
}

export function getAvailableProviders(): ProviderConfig[] {
  return PROVIDERS.filter((p) => !!process.env[p.envKey]);
}
