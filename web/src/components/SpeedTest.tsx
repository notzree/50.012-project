"use client";

import { useEffect, useState, useCallback } from "react";
import { ProviderConfig } from "@/lib/providers";
import { useBenchmark } from "@/hooks/useBenchmark";
import BenchmarkGauge from "./BenchmarkGauge";
import MetricsPanel from "./MetricsPanel";
import ProviderSelector from "./ProviderSelector";
import ResultsTable from "./ResultsTable";
import StartButton from "./StartButton";

export default function SpeedTest() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const {
    isRunning,
    currentProvider,
    metrics,
    allResults,
    liveTokens,
    liveTps,
    liveTtfb,
    liveElapsed,
    error,
    runBenchmark,
    runAll,
    reset,
  } = useBenchmark();

  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        setProviders(data.providers ?? []);
        if (data.providers?.length > 0 && !selectedProvider) {
          setSelectedProvider(data.providers[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleStart = useCallback(() => {
    if (selectedProvider) {
      runBenchmark(selectedProvider);
    }
  }, [selectedProvider, runBenchmark]);

  const displayTps = isRunning ? liveTps : (metrics?.tps ?? 0);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI Speed Test
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Benchmark AI providers — measure tokens per second, latency &amp; more
        </p>
      </div>

      {/* Provider Selector */}
      <ProviderSelector
        providers={providers}
        selected={selectedProvider}
        onSelect={setSelectedProvider}
        disabled={isRunning}
      />

      {/* Gauge */}
      <BenchmarkGauge value={displayTps} isRunning={isRunning} />

      {/* Live Metrics */}
      <MetricsPanel
        metrics={metrics}
        liveTps={liveTps}
        liveTtfb={liveTtfb}
        liveTokens={liveTokens}
        liveElapsed={liveElapsed}
        isRunning={isRunning}
      />

      {/* Actions */}
      <div className="flex gap-3 items-center">
        <StartButton onClick={handleStart} isRunning={isRunning} />
        <StartButton
          onClick={runAll}
          isRunning={isRunning}
          label="Benchmark All"
        />
        {allResults.length > 0 && !isRunning && (
          <button
            onClick={reset}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full max-w-md bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Running indicator */}
      {isRunning && currentProvider && (
        <p className="text-sm text-gray-500 animate-pulse">
          Testing {currentProvider}...
        </p>
      )}

      {/* Results */}
      <ResultsTable results={allResults} />
    </div>
  );
}
