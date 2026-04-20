"use client";

import { useEffect, useState, useCallback } from "react";
import { ProviderConfig } from "@/lib/providers";
import { useBenchmark } from "@/hooks/useBenchmark";
import BenchmarkGauge from "./BenchmarkGauge";
import MetricsPanel from "./MetricsPanel";
import ProviderSelector from "./ProviderSelector";
import ResultsTable from "./ResultsTable";
import CommunityResults from "./CommunityResults";
import StartButton from "./StartButton";
import ApiKeyManager, { loadApiKeys } from "./ApiKeyManager";

export default function SpeedTest() {
  const [allProviders, setAllProviders] = useState<ProviderConfig[]>([]);
  const [serverProviderIds, setServerProviderIds] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

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
    benchmarkMode,
    runBenchmark,
    runAll,
    reset,
  } = useBenchmark();

  useEffect(() => {
    setApiKeys(loadApiKeys());
  }, []);

  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        const all: ProviderConfig[] = data.allProviders ?? data.providers ?? [];
        const server: ProviderConfig[] = data.providers ?? [];
        setAllProviders(all);
        setServerProviderIds(server.map((p) => p.id));
        if (all.length > 0 && !selectedProvider) {
          setSelectedProvider(all[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleModelSelect = useCallback((providerId: string, model: string) => {
    setSelectedModels((prev) => ({ ...prev, [providerId]: model }));
  }, []);

  const handleStart = useCallback(() => {
    if (selectedProvider) {
      const config = allProviders.find((p) => p.id === selectedProvider);
      if (!config) return;
      const modelToRun = selectedModels[selectedProvider] || config.models[0];
      runBenchmark(selectedProvider, modelToRun, apiKeys[selectedProvider]);
    }
  }, [selectedProvider, selectedModels, allProviders, runBenchmark, apiKeys]);

  const handleRunAll = useCallback(() => {
    runAll(apiKeys, selectedModels);
  }, [runAll, apiKeys, selectedModels]);

  const displayTps = isRunning ? liveTps : (metrics?.tps ?? 0);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI Speed Test
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Benchmark AI providers — measure tokens per second, latency, cache &amp; more
        </p>
      </div>

      {/* Provider Selector */}
      <ProviderSelector
        providers={allProviders}
        selected={selectedProvider}
        onSelect={setSelectedProvider}
        selectedModels={selectedModels}
        onModelSelect={handleModelSelect}
        disabled={isRunning}
        apiKeys={apiKeys}
        serverProviderIds={serverProviderIds}
      />

      {/* BYOK API Keys */}
      <ApiKeyManager
        providers={allProviders}
        apiKeys={apiKeys}
        onKeysChange={setApiKeys}
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
      <div className="flex gap-3 items-center flex-wrap justify-center">
        <StartButton onClick={handleStart} isRunning={isRunning} />
        <StartButton
          onClick={handleRunAll}
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

      {/* Benchmark mode indicator */}
      {isRunning && benchmarkMode && (
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              benchmarkMode === "client" ? "bg-green-400" : "bg-yellow-400"
            }`}
          />
          <span className="text-xs text-gray-500">
            {benchmarkMode === "client"
              ? "Direct from your browser — true end-to-end latency"
              : "Via server proxy — latency reflects server-to-provider"}
          </span>
        </div>
      )}

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

      {/* Session Results */}
      <ResultsTable results={allResults} />

      {/* Community Results */}
      <CommunityResults />
    </div>
  );
}
