"use client";

import { useState, useRef, useCallback } from "react";
import { BenchmarkMetrics, BenchmarkEvent, CrowdsourcedResult, UserLocation } from "@/lib/metrics";
import { ProviderConfig } from "@/lib/providers";
import { getUserLocation } from "@/lib/geo";
import { supportsClientSide, getClientStreamer } from "@/lib/client-providers";
import { BENCHMARK_PROMPT, PROVIDERS } from "@/lib/constants";

export interface UseBenchmarkReturn {
  isRunning: boolean;
  currentProvider: string | null;
  metrics: BenchmarkMetrics | null;
  allResults: BenchmarkMetrics[];
  liveTokens: number;
  liveTps: number;
  liveTtfb: number | null;
  liveElapsed: number;
  liveContent: string;
  error: string | null;
  benchmarkMode: "client" | "server" | null;

  runBenchmark: (providerId: string, apiKey?: string) => Promise<void>;
  runAll: (apiKeys: Record<string, string>) => Promise<void>;
  reset: () => void;
}

async function submitToDb(
  metrics: BenchmarkMetrics,
  location: UserLocation | null
): Promise<void> {
  try {
    const body: CrowdsourcedResult = {
      ...metrics,
      userCity: location?.city,
      userRegion: location?.region,
      userCountry: location?.country,
      userLat: location?.lat,
      userLon: location?.lon,
      serverRegion: "client-direct",
    };
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // silently ignore submission failures
  }
}

export function useBenchmark(): UseBenchmarkReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [allResults, setAllResults] = useState<BenchmarkMetrics[]>([]);
  const [liveTokens, setLiveTokens] = useState(0);
  const [liveTps, setLiveTps] = useState(0);
  const [liveTtfb, setLiveTtfb] = useState<number | null>(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [liveContent, setLiveContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [benchmarkMode, setBenchmarkMode] = useState<"client" | "server" | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const locationRef = useRef<UserLocation | null>(null);

  const resetLiveState = useCallback(() => {
    setMetrics(null);
    setLiveTokens(0);
    setLiveTps(0);
    setLiveTtfb(null);
    setLiveElapsed(0);
    setLiveContent("");
    setError(null);
  }, []);

  const runClientSide = useCallback(
    async (providerId: string, apiKey: string, signal: AbortSignal) => {
      const streamer = getClientStreamer(providerId);
      if (!streamer) throw new Error("No client streamer for this provider");

      const providerConfig = PROVIDERS.find((p) => p.id === providerId);
      if (!providerConfig) throw new Error("Unknown provider");

      let tokenAccum = 0;
      let contentAccum = "";

      await streamer(BENCHMARK_PROMPT, apiKey, providerConfig.model, signal, {
        onEvent: (event: BenchmarkEvent) => {
          switch (event.type) {
            case "chunk": {
              tokenAccum += event.tokenCount;
              contentAccum += event.content;
              const tps = event.elapsed > 0 ? tokenAccum / (event.elapsed / 1000) : 0;
              setLiveTokens(tokenAccum);
              setLiveContent(contentAccum);
              setLiveTps(tps);
              setLiveElapsed(event.elapsed);
              setLiveTtfb((prev) => (prev === null ? event.elapsed : prev));
              break;
            }
            case "complete":
              setMetrics(event.metrics);
              setAllResults((prev) => [...prev, event.metrics]);
              setIsRunning(false);
              setCurrentProvider(null);
              submitToDb(event.metrics, locationRef.current);
              break;
            case "error":
              setError(event.error);
              setIsRunning(false);
              setCurrentProvider(null);
              break;
          }
        },
      });
    },
    []
  );

  const runServerSide = useCallback(
    async (providerId: string, apiKey: string | undefined, signal: AbortSignal) => {
      const response = await fetch(`/api/benchmark/${providerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey || undefined }),
        signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Benchmark request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let tokenAccum = 0;
      let contentAccum = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith("data: ")) continue;
          const json = dataLine.slice(6);

          try {
            const event: BenchmarkEvent = JSON.parse(json);

            switch (event.type) {
              case "chunk": {
                tokenAccum += event.tokenCount;
                contentAccum += event.content;
                const tps = event.elapsed > 0 ? tokenAccum / (event.elapsed / 1000) : 0;
                setLiveTokens(tokenAccum);
                setLiveContent(contentAccum);
                setLiveTps(tps);
                setLiveElapsed(event.elapsed);
                setLiveTtfb((prev) => (prev === null ? event.elapsed : prev));
                break;
              }
              case "complete":
                setMetrics(event.metrics);
                setAllResults((prev) => [...prev, event.metrics]);
                setIsRunning(false);
                setCurrentProvider(null);
                submitToDb(event.metrics, locationRef.current);
                break;
              case "error":
                setError(event.error);
                setIsRunning(false);
                setCurrentProvider(null);
                break;
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }
    },
    []
  );

  const runBenchmark = useCallback(
    async (providerId: string, apiKey?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRunning(true);
      setCurrentProvider(providerId);
      resetLiveState();

      if (!locationRef.current) {
        locationRef.current = await getUserLocation();
      }

      const useClient = !!apiKey && supportsClientSide(providerId);
      setBenchmarkMode(useClient ? "client" : "server");

      try {
        if (useClient) {
          await runClientSide(providerId, apiKey!, controller.signal);
        } else {
          await runServerSide(providerId, apiKey, controller.signal);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : String(err));
        }
        setIsRunning(false);
        setCurrentProvider(null);
      }
    },
    [resetLiveState, runClientSide, runServerSide]
  );

  const runAll = useCallback(
    async (apiKeys: Record<string, string>) => {
      try {
        const res = await fetch("/api/providers");
        const data = await res.json();
        const allProviders: ProviderConfig[] = data.allProviders ?? data.providers;

        const runnableProviders = allProviders.filter(
          (p) =>
            apiKeys[p.id] ||
            data.providers?.some((sp: ProviderConfig) => sp.id === p.id)
        );

        for (const provider of runnableProviders) {
          await runBenchmark(provider.id, apiKeys[provider.id]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [runBenchmark]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
    setCurrentProvider(null);
    setMetrics(null);
    setAllResults([]);
    setLiveTokens(0);
    setLiveTps(0);
    setLiveTtfb(null);
    setLiveElapsed(0);
    setLiveContent("");
    setError(null);
    setBenchmarkMode(null);
  }, []);

  return {
    isRunning,
    currentProvider,
    metrics,
    allResults,
    liveTokens,
    liveTps,
    liveTtfb,
    liveElapsed,
    liveContent,
    error,
    benchmarkMode,
    runBenchmark,
    runAll,
    reset,
  };
}
