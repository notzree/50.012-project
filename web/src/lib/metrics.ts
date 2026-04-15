export interface UserLocation {
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

export interface BenchmarkMetrics {
  provider: string;
  model: string;
  tps: number;
  ttfb: number;
  totalLatency: number;
  outputTokens: number;
  inputTokens: number;
  cacheStatus: "hit" | "miss" | "unknown";
  timestamp: number;
  error?: string;
}

export interface CrowdsourcedResult extends BenchmarkMetrics {
  id?: string;
  userCity?: string;
  userRegion?: string;
  userCountry?: string;
  userLat?: number;
  userLon?: number;
  serverRegion?: string;
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
