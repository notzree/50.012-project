"use client";

import { useEffect, useState } from "react";

interface AggregateStats {
  provider: string;
  model: string;
  avgTps: number;
  avgTtfb: number;
  cacheHitRate: number;
  totalRuns: number;
}

export default function CommunityResults() {
  const [stats, setStats] = useState<AggregateStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/results?aggregate=true")
      .then((res) => res.json())
      .then((data) => setStats(data.stats ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center text-gray-600 text-sm py-4">
        Loading community data...
      </div>
    );
  }

  if (stats.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-300 mb-3">
        Community Benchmarks
      </h2>
      <p className="text-xs text-gray-600 mb-3">
        Aggregated from all users worldwide
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/80 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Provider</th>
              <th className="px-4 py-3 text-left">Model</th>
              <th className="px-4 py-3 text-right">Avg TPS</th>
              <th className="px-4 py-3 text-right">Avg TTFB</th>
              <th className="px-4 py-3 text-right">Cache Hit %</th>
              <th className="px-4 py-3 text-right">Runs</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr
                key={`${stat.provider}-${stat.model}`}
                className="border-t border-gray-800 text-gray-300"
              >
                <td className="px-4 py-3 font-medium">{stat.provider}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{stat.model}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {stat.avgTps.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {stat.avgTtfb.toFixed(0)} ms
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {(stat.cacheHitRate * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                  {stat.totalRuns}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
