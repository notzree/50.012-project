"use client";

import { useState, useRef, useCallback } from "react";
import { BenchmarkMetrics, BenchmarkEvent } from "@/lib/metrics";
import { ProviderConfig } from "@/lib/providers";

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

  runBenchmark: (providerId: string) => Promise<void>;
  runAll: () => Promise<void>;
  reset: () => void;
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
  const abortRef = useRef<AbortController | null>(null);

  const runBenchmark = useCallback(async (providerId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setCurrentProvider(providerId);
    setMetrics(null);
    setLiveTokens(0);
    setLiveTps(0);
    setLiveTtfb(null);
    setLiveElapsed(0);
    setLiveContent("");
    setError(null);

    try {
      const response = await fetch(`/api/benchmark/${providerId}`, {
        signal: controller.signal,
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
                const tps =
                  event.elapsed > 0
                    ? tokenAccum / (event.elapsed / 1000)
                    : 0;
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
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : String(err));
      }
      setIsRunning(false);
      setCurrentProvider(null);
    }
  }, []);

  const runAll = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      const providers: ProviderConfig[] = data.providers;

      for (const provider of providers) {
        await runBenchmark(provider.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [runBenchmark]);

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
    runBenchmark,
    runAll,
    reset,
  };
}
