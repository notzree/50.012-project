"use client";

import { BenchmarkMetrics } from "@/lib/metrics";

interface ResultsTableProps {
  results: BenchmarkMetrics[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  if (results.length === 0) return null;

  const sorted = [...results].sort((a, b) => b.tps - a.tps);
  const bestTps = sorted[0]?.tps ?? 0;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-300 mb-3">Results</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/80 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Provider</th>
              <th className="px-4 py-3 text-left">Model</th>
              <th className="px-4 py-3 text-right">TPS</th>
              <th className="px-4 py-3 text-right">TTFB</th>
              <th className="px-4 py-3 text-right">Latency</th>
              <th className="px-4 py-3 text-right">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((result, idx) => (
              <tr
                key={`${result.provider}-${result.timestamp}`}
                className={`border-t border-gray-800 ${
                  result.tps === bestTps
                    ? "bg-blue-500/5 text-white"
                    : "text-gray-300"
                }`}
              >
                <td className="px-4 py-3 font-mono">
                  {result.tps === bestTps ? (
                    <span className="text-yellow-400">★</span>
                  ) : (
                    idx + 1
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{result.provider}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {result.model}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {result.tps.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {result.ttfb.toFixed(0)} ms
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {(result.totalLatency / 1000).toFixed(2)}s
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {result.outputTokens}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
