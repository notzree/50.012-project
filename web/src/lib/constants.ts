import { ProviderConfig } from "./providers";

export const BENCHMARK_PROMPT = `Write a detailed explanation of how neural networks learn through backpropagation. Cover the forward pass, loss calculation, gradient computation, and weight updates. Include mathematical intuition but keep it accessible.`;

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"],
    envKey: "OPENAI_API_KEY",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: ["claude-sonnet-4-6", "claude-haiku-4-5", "claude-opus-4-7"],
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "google",
    name: "Google Gemini",
    models: [
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-pro-preview",
      "gemini-3-flash-preview",
    ],
    envKey: "GOOGLE_API_KEY",
  },
  {
    id: "groq",
    name: "Groq",
    models: [
      "llama-3.3-70b-versatile",
      "llama3-8b-8192",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    envKey: "GROQ_API_KEY",
  },
];
