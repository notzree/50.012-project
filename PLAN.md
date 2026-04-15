# AI Speed Test — Next.js Web App Implementation Plan

A single-page Next.js web application that benchmarks AI providers, measuring tokens per second (TPS) and other streaming metrics. Inspired by speedtest.net — one page, pick a provider (or benchmark all), hit start, and watch real-time results.

---

## Architecture Overview

```
/workspace
├── web/                          # Next.js app (scaffolded here)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── page.tsx          # Single-page speedtest UI
│   │   │   ├── globals.css       # Global styles (Tailwind)
│   │   │   └── api/
│   │   │       └── benchmark/
│   │   │           └── [provider]/
│   │   │               └── route.ts   # Streaming benchmark API
│   │   ├── components/
│   │   │   ├── SpeedTest.tsx          # Main orchestrator component
│   │   │   ├── ProviderSelector.tsx   # Dropdown/card selector for providers
│   │   │   ├── BenchmarkGauge.tsx     # Animated gauge/speedometer display
│   │   │   ├── MetricsPanel.tsx       # Live metrics readout (TPS, TTFB, etc.)
│   │   │   ├── ResultsTable.tsx       # Results summary after benchmark
│   │   │   └── StartButton.tsx        # Start/stop benchmark button
│   │   ├── lib/
│   │   │   ├── providers/
│   │   │   │   ├── index.ts           # Provider registry & types
│   │   │   │   ├── openai.ts          # OpenAI streaming client
│   │   │   │   ├── anthropic.ts       # Anthropic streaming client
│   │   │   │   ├── google.ts          # Google Gemini streaming client
│   │   │   │   └── groq.ts            # Groq streaming client
│   │   │   ├── benchmark.ts           # Core benchmark logic (timing, metrics)
│   │   │   ├── metrics.ts             # Metric types & calculations
│   │   │   └── constants.ts           # Shared constants (prompts, config)
│   │   └── hooks/
│   │       └── useBenchmark.ts        # React hook for benchmark state & SSE consumption
│   ├── public/                        # Static assets
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── package.json
│   └── .env.example                   # API key placeholders
├── readme.md
└── PLAN.md                            # This file
```

---

## Metrics to Track

Each benchmark run measures the following for a given provider/model:

| Metric | Description | How It's Calculated |
|--------|-------------|---------------------|
| **TPS (Tokens Per Second)** | Output generation speed | `total_output_tokens / generation_duration_seconds` |
| **TTFB (Time to First Byte)** | Latency before first token arrives | `first_chunk_timestamp - request_start_timestamp` |
| **Total Latency** | End-to-end request time | `last_chunk_timestamp - request_start_timestamp` |
| **Output Tokens** | Number of tokens generated | Counted from streamed chunks (provider-reported when available) |
| **Input Tokens** | Number of tokens in the prompt | Provider-reported from usage metadata |

---

## Supported Providers

| Provider | Model (default) | SDK / API | Env Variable |
|----------|----------------|-----------|--------------|
| OpenAI | `gpt-4o` | `openai` npm package | `OPENAI_API_KEY` |
| Anthropic | `claude-sonnet-4-20250514` | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` |
| Google Gemini | `gemini-2.0-flash` | `@google/generative-ai` | `GOOGLE_API_KEY` |
| Groq | `llama-3.3-70b-versatile` | `groq-sdk` | `GROQ_API_KEY` |

More providers can be added by implementing the `BenchmarkProvider` interface and registering in the provider index.

---

## Shared Types & Interfaces

These types are shared across tasks. Each agent should use them exactly as defined here.

```typescript
// lib/metrics.ts

export interface BenchmarkMetrics {
  provider: string;
  model: string;
  tps: number;                  // tokens per second
  ttfb: number;                 // time to first byte (ms)
  totalLatency: number;         // total request duration (ms)
  outputTokens: number;
  inputTokens: number;
  timestamp: number;            // Date.now() when benchmark completed
  error?: string;               // populated if benchmark failed
}

export interface StreamingChunkEvent {
  type: "chunk";
  content: string;
  tokenCount: number;           // tokens in this chunk
  elapsed: number;              // ms since request start
}

export interface BenchmarkStartEvent {
  type: "start";
  provider: string;
  model: string;
}

export interface BenchmarkCompleteEvent {
  type: "complete";
  metrics: BenchmarkMetrics;
}

export interface BenchmarkErrorEvent {
  type: "error";
  error: string;
}

export type BenchmarkEvent =
  | BenchmarkStartEvent
  | StreamingChunkEvent
  | BenchmarkCompleteEvent
  | BenchmarkErrorEvent;
```

```typescript
// lib/providers/index.ts

export interface ProviderConfig {
  id: string;                   // url-safe slug: "openai", "anthropic", etc.
  name: string;                 // display name: "OpenAI", "Anthropic", etc.
  model: string;                // default model identifier
  envKey: string;               // env variable name for the API key
}

export interface BenchmarkProvider {
  config: ProviderConfig;
  stream(prompt: string): AsyncGenerator<BenchmarkEvent>;
}
```

```typescript
// lib/constants.ts

export const BENCHMARK_PROMPT = `Write a detailed explanation of how neural networks learn through backpropagation. Cover the forward pass, loss calculation, gradient computation, and weight updates. Include mathematical intuition but keep it accessible.`;

export const PROVIDERS: ProviderConfig[] = [
  { id: "openai",    name: "OpenAI",         model: "gpt-4o",                    envKey: "OPENAI_API_KEY" },
  { id: "anthropic", name: "Anthropic",       model: "claude-sonnet-4-20250514",        envKey: "ANTHROPIC_API_KEY" },
  { id: "google",    name: "Google Gemini",   model: "gemini-2.0-flash",          envKey: "GOOGLE_API_KEY" },
  { id: "groq",      name: "Groq",            model: "llama-3.3-70b-versatile",   envKey: "GROQ_API_KEY" },
];
```

---

## Task Breakdown

The following tasks are **independent** and can be executed in parallel by separate agents. Each task has clear inputs, outputs, and boundaries.

---

### Task 1: Scaffold & Project Setup ✅ COMPLETE

**Goal:** Create the Next.js project skeleton in `/workspace/web` with all dependencies and configuration.

**Steps:**

1. From `/workspace`, run:
   ```bash
   npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
2. `cd web` and install additional dependencies:
   ```bash
   npm install openai @anthropic-ai/sdk @google/generative-ai groq-sdk
   npm install -D @types/node
   ```
3. Create `/workspace/web/.env.example`:
   ```
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=AI...
   GROQ_API_KEY=gsk_...
   ```
4. Create the shared type files exactly as specified above:
   - `src/lib/metrics.ts` — all event types and `BenchmarkMetrics`
   - `src/lib/providers/index.ts` — `ProviderConfig`, `BenchmarkProvider`, provider registry
   - `src/lib/constants.ts` — `BENCHMARK_PROMPT` and `PROVIDERS` array
5. Create placeholder/stub files for all components and routes listed in the architecture (empty exports are fine — other tasks will fill them in).
6. Verify the app builds with `npm run build` (stubs may need minimal valid JSX like `export default function Page() { return null; }`).

**Output:** A buildable Next.js project at `/workspace/web` with all deps, types, and stubs in place.

**Dependencies:** None. This should be done first, or other agents should be able to create files independently.

---

### Task 2: Provider Implementations (Server-Side) ✅ COMPLETE

**Goal:** Implement the streaming AI provider clients in `src/lib/providers/`.

**Files to create/edit:**
- `src/lib/providers/openai.ts`
- `src/lib/providers/anthropic.ts`
- `src/lib/providers/google.ts`
- `src/lib/providers/groq.ts`
- `src/lib/providers/index.ts` (add `getProvider()` factory)

**For each provider, implement:**

1. A class or object implementing `BenchmarkProvider`
2. A `stream(prompt: string)` async generator that:
   - Initializes the provider's SDK client using the corresponding env variable
   - Starts a timer (`performance.now()`)
   - Calls the provider's streaming/chat completion API with `stream: true`
   - Yields a `BenchmarkStartEvent` immediately
   - For each chunk received from the stream:
     - Extracts the text content delta
     - Estimates token count (use provider-reported counts when available; otherwise approximate as `Math.ceil(text.length / 4)`)
     - Yields a `StreamingChunkEvent` with the content, token count, and elapsed time
   - After the stream completes, computes final `BenchmarkMetrics`:
     - `ttfb` = elapsed time of the first chunk
     - `totalLatency` = elapsed time of the last chunk
     - `outputTokens` = sum of all chunk token counts
     - `tps` = `outputTokens / (totalLatency / 1000)`
     - `inputTokens` from usage metadata if available
   - Yields a `BenchmarkCompleteEvent` with the metrics
   - On error, yields a `BenchmarkErrorEvent`

3. In `src/lib/providers/index.ts`, export a `getProvider(id: string): BenchmarkProvider` function that returns the correct provider instance, and a `getAvailableProviders(): ProviderConfig[]` function that returns only providers whose env key is set.

**Provider-specific notes:**

- **OpenAI:** Use `openai` package. `new OpenAI()`. Call `chat.completions.create({ model, messages, stream: true })`. Iterate the stream. Delta content is in `chunk.choices[0]?.delta?.content`.
- **Anthropic:** Use `@anthropic-ai/sdk`. `new Anthropic()`. Call `messages.stream({ model, max_tokens: 1024, messages })`. Events of type `content_block_delta` have `delta.text`.
- **Google Gemini:** Use `@google/generative-ai`. `new GoogleGenerativeAI(apiKey)`. Get model, call `generateContentStream({ contents })`. Iterate `stream` for chunks, use `chunk.text()`.
- **Groq:** Use `groq-sdk`. Same interface as OpenAI. `new Groq()`. Call `chat.completions.create({ model, messages, stream: true })`. Same delta extraction as OpenAI.

**Output:** Four provider files + updated index with factory function. All server-side only (no `"use client"`).

**Dependencies:** Needs the types from `lib/metrics.ts` and `lib/constants.ts` (can be created inline if Task 1 hasn't run yet).

---

### Task 3: API Route — `/api/benchmark/[provider]` ✅ COMPLETE

**Goal:** Implement the Next.js App Router API route that streams benchmark events as Server-Sent Events (SSE).

**File:** `src/app/api/benchmark/[provider]/route.ts`

**Implementation:**

1. Export an async `GET` handler:
   ```typescript
   export async function GET(
     request: Request,
     { params }: { params: Promise<{ provider: string }> }
   ): Promise<Response>
   ```

2. Extract `provider` from the resolved params.

3. Validate the provider ID exists. If not, return a 400 JSON response: `{ error: "Unknown provider" }`.

4. Check that the provider's API key env var is set. If not, return a 400 JSON response: `{ error: "API key not configured for <provider>" }`.

5. Create a `ReadableStream` that:
   - Gets the provider instance via `getProvider(providerId)`
   - Iterates the provider's `stream(BENCHMARK_PROMPT)` async generator
   - For each `BenchmarkEvent`, encodes it as an SSE message: `data: ${JSON.stringify(event)}\n\n`
   - Closes the stream after the `complete` or `error` event

6. Return a `Response` with:
   - The readable stream as body
   - Headers:
     ```
     Content-Type: text/event-stream
     Cache-Control: no-cache
     Connection: keep-alive
     ```

7. Also create a secondary endpoint or add query param support (`?action=providers`) that returns the list of available providers as JSON (calls `getAvailableProviders()`). Alternatively, this can be a separate route `src/app/api/providers/route.ts` that returns `{ providers: ProviderConfig[] }`.

**Output:** Working SSE endpoint that streams benchmark events for a given provider.

**Dependencies:** Requires Task 2 (provider implementations) and shared types.

---

### Task 4: Frontend — `useBenchmark` Hook ✅ COMPLETE

**Goal:** Implement the React hook that manages benchmark state and consumes the SSE stream from the API.

**File:** `src/hooks/useBenchmark.ts`

**Interface:**

```typescript
export interface UseBenchmarkReturn {
  // State
  isRunning: boolean;
  currentProvider: string | null;
  metrics: BenchmarkMetrics | null;        // latest completed result
  allResults: BenchmarkMetrics[];          // all results in this session
  liveTokens: number;                      // tokens received so far (live)
  liveTps: number;                         // current TPS (live, computed as tokens/elapsed)
  liveTtfb: number | null;                // TTFB once first chunk arrives
  liveElapsed: number;                     // ms since benchmark started
  liveContent: string;                     // accumulated generated text
  error: string | null;

  // Actions
  runBenchmark: (providerId: string) => Promise<void>;
  runAll: () => Promise<void>;             // sequential benchmark of all available providers
  reset: () => void;
}
```

**Implementation:**

1. Mark as `"use client"`.
2. Use `useState` for all state fields.
3. `runBenchmark(providerId)`:
   - Set `isRunning = true`, `currentProvider = providerId`, reset live metrics.
   - Use `EventSource` or `fetch` with `getReader()` to connect to `/api/benchmark/${providerId}`.
   - Parse SSE `data:` lines, deserialize JSON into `BenchmarkEvent` objects.
   - On `"start"`: no-op (already set state).
   - On `"chunk"`: accumulate `liveTokens`, `liveContent`, recompute `liveTps`. If `liveTtfb` is null, set it from `event.elapsed`.
   - On `"complete"`: set `metrics` from event, push to `allResults`, set `isRunning = false`.
   - On `"error"`: set `error`, set `isRunning = false`.
   - Use a `useRef` for an `AbortController` so the stream can be cancelled.
4. `runAll()`:
   - Fetch available providers from `/api/providers`.
   - Loop through each, calling `runBenchmark(id)` sequentially.
   - Accumulate all results in `allResults`.
5. `reset()`: clear all state to initial values.

**Output:** A single hook file that any component can use to drive benchmarks.

**Dependencies:** Needs the shared types from `lib/metrics.ts`. Does not depend on the API route being implemented (but won't work at runtime without it).

---

### Task 5: Frontend — UI Components & Page ✅ COMPLETE

**Goal:** Build the single-page speedtest UI with all visual components.

**Files:**
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/SpeedTest.tsx`
- `src/components/ProviderSelector.tsx`
- `src/components/BenchmarkGauge.tsx`
- `src/components/MetricsPanel.tsx`
- `src/components/ResultsTable.tsx`
- `src/components/StartButton.tsx`

**Design Requirements:**

- **Dark theme** with a modern, minimal aesthetic (dark gray/near-black background, accent colors for metrics).
- **Responsive** — works on desktop and mobile.
- **Speedtest-inspired layout:**
  - Top: App title "AI Speed Test" with a brief subtitle
  - Center: Large animated gauge/speedometer showing live TPS during benchmark (when idle, shows last result or 0)
  - Below gauge: Live metric readouts (TTFB, tokens generated, elapsed time)
  - Above or beside gauge: Provider selector (cards or dropdown)
  - Prominent "Start Test" / "Benchmark All" buttons
  - Bottom: Results table showing historical results from the session

**Component Specifications:**

#### `SpeedTest.tsx`
- `"use client"` — this is the main orchestrator.
- Uses `useBenchmark()` hook.
- Composes all sub-components, passing state and callbacks as props.
- Fetches available providers on mount from `/api/providers` and passes to `ProviderSelector`.

#### `ProviderSelector.tsx`
- Renders provider options as clickable cards (name + model).
- Has a "Benchmark All" option.
- Highlights the selected/active provider.
- Props: `providers: ProviderConfig[]`, `selected: string | null`, `onSelect: (id: string) => void`, `disabled: boolean`.

#### `BenchmarkGauge.tsx`
- Animated circular gauge / speedometer SVG.
- Center displays the current TPS value (large, animated number).
- Gauge fills proportionally (scale 0–200+ TPS, adaptive to results).
- Animated transitions using CSS transitions or `requestAnimationFrame`.
- Props: `value: number` (current TPS), `isRunning: boolean`, `maxValue?: number`.

#### `MetricsPanel.tsx`
- Grid of metric cards showing: TPS, TTFB (ms), Total Latency (ms), Output Tokens, Input Tokens.
- Each card has a label and a value.
- Values animate/update in real-time during benchmarks.
- Props: `metrics: Partial<BenchmarkMetrics>`, `liveTps: number`, `liveTtfb: number | null`, `liveTokens: number`, `liveElapsed: number`, `isRunning: boolean`.

#### `ResultsTable.tsx`
- Table/list of all benchmark results in the session.
- Columns: Provider, Model, TPS, TTFB, Total Latency, Output Tokens.
- Sorted by TPS descending (fastest first). 
- Highlight the best result.
- Props: `results: BenchmarkMetrics[]`.

#### `StartButton.tsx`
- Large, prominent button.
- Shows "Start Test" when idle, "Running..." with a spinner when active.
- Disabled while running.
- Props: `onClick: () => void`, `isRunning: boolean`, `label?: string`.

#### `page.tsx`
- Minimal — just renders `<SpeedTest />`.
- No `"use client"` needed if `SpeedTest` is a client component.

#### `layout.tsx`
- Sets up metadata (title: "AI Speed Test", description).
- Applies dark theme via Tailwind `dark` class on `<html>` or through `globals.css`.
- Imports `globals.css`.

#### `globals.css`
- Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`).
- Set body/html to dark background (`bg-gray-950 text-white`).
- Any custom animations (gauge sweep, pulse, number ticker).

**Styling:** Use Tailwind CSS utility classes exclusively. No additional CSS libraries needed.

**Output:** All component files + page + layout + styles forming the complete UI.

**Dependencies:** Needs `useBenchmark` hook (Task 4) and shared types. Can stub the hook for visual development.

---

## Task Dependency Graph

```
Task 1 (Scaffold)
   ├──→ Task 2 (Providers) ──→ Task 3 (API Route)
   ├──→ Task 4 (useBenchmark Hook)
   └──→ Task 5 (UI Components & Page)
```

- **Task 1** should ideally run first to set up the project, but other tasks can create their files independently as long as they follow the directory structure above.
- **Tasks 2, 4, and 5** can run in parallel after Task 1.
- **Task 3** depends on Task 2 (imports provider implementations).
- **Task 5** depends on Task 4 at runtime (imports the hook).

If agents are working in parallel, they should each create only their own files and avoid modifying files owned by other tasks. Shared types (`lib/metrics.ts`, `lib/constants.ts`, `lib/providers/index.ts` types) should be created by Task 1 and treated as read-only by other tasks.

---

## Environment Variables

The app requires API keys to be set in `.env.local` (not committed). The `.env.example` file documents what's needed. At minimum, one provider key must be set for the app to be useful. The `/api/providers` endpoint returns only providers with configured keys, so the UI gracefully handles missing keys.

---

## Testing the App

After all tasks are complete:

1. `cd /workspace/web`
2. Copy `.env.example` to `.env.local` and fill in at least one API key.
3. `npm run dev`
4. Open `http://localhost:3000`
5. Select a provider, click "Start Test", observe real-time TPS gauge and metrics.
6. Try "Benchmark All" to run all configured providers sequentially.
7. Verify results table populates after each run.
