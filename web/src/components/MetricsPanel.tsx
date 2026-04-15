"use client";

import { BenchmarkMetrics } from "@/lib/metrics";

interface MetricsPanelProps {
  metrics: Partial<BenchmarkMetrics> | null;
  liveTps: number;
  liveTtfb: number | null;
  liveTokens: number;
  liveElapsed: number;
  isRunning: boolean;
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 min-w-[120px]">
      <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums text-white">
        {value}
      </span>
      <span className="text-xs text-gray-600">{unit}</span>
    </div>
  );
}

export default function MetricsPanel({
  metrics,
  liveTps,
  liveTtfb,
  liveTokens,
  liveElapsed,
  isRunning,
}: MetricsPanelProps) {
  const tps = isRunning ? liveTps : (metrics?.tps ?? 0);
  const ttfb = isRunning ? liveTtfb : (metrics?.ttfb ?? null);
  const tokens = isRunning ? liveTokens : (metrics?.outputTokens ?? 0);
  const elapsed = isRunning ? liveElapsed : (metrics?.totalLatency ?? 0);
  const inputTokens = metrics?.inputTokens ?? 0;

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <MetricCard
        label="TPS"
        value={tps.toFixed(1)}
        unit="tok/s"
      />
      <MetricCard
        label="TTFB"
        value={ttfb !== null ? ttfb.toFixed(0) : "—"}
        unit="ms"
      />
      <MetricCard
        label="Latency"
        value={elapsed > 0 ? (elapsed / 1000).toFixed(2) : "—"}
        unit="sec"
      />
      <MetricCard
        label="Output"
        value={tokens}
        unit="tokens"
      />
      <MetricCard
        label="Input"
        value={inputTokens || "—"}
        unit="tokens"
      />
    </div>
  );
}
