import { ProviderConfig } from "./providers";

export const BENCHMARK_PROMPT = `Write a detailed explanation of how neural networks learn through backpropagation. Cover the forward pass, loss calculation, gradient computation, and weight updates. Include mathematical intuition but keep it accessible.`;

export const PROVIDERS: ProviderConfig[] = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o1-mini", "o3-mini"], envKey: "OPENAI_API_KEY" },
  { id: "anthropic", name: "Anthropic", models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"], envKey: "ANTHROPIC_API_KEY" },
  { id: "google", name: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"], envKey: "GOOGLE_API_KEY" },
  { id: "groq", name: "Groq", models: ["llama-3.3-70b-versatile", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"], envKey: "GROQ_API_KEY" },
];
