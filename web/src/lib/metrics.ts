export interface BenchmarkMetrics {
  provider: string;
  model: string;
  tps: number;
  ttfb: number;
  totalLatency: number;
  outputTokens: number;
  inputTokens: number;
  timestamp: number;
  error?: string;
}

export interface StreamingChunkEvent {
  type: "chunk";
  content: string;
  tokenCount: number;
  elapsed: number;
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
