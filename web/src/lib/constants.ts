import { ProviderConfig } from "./providers";

export const BENCHMARK_PROMPT = `Write a detailed explanation of how neural networks learn through backpropagation. Cover the forward pass, loss calculation, gradient computation, and weight updates. Include mathematical intuition but keep it accessible.`;

export const PROVIDERS: ProviderConfig[] = [
  { id: "openai", name: "OpenAI", model: "gpt-4o", envKey: "OPENAI_API_KEY" },
  { id: "anthropic", name: "Anthropic", model: "claude-sonnet-4-20250514", envKey: "ANTHROPIC_API_KEY" },
  { id: "google", name: "Google Gemini", model: "gemini-2.0-flash", envKey: "GOOGLE_API_KEY" },
  { id: "groq", name: "Groq", model: "llama-3.3-70b-versatile", envKey: "GROQ_API_KEY" },
];
