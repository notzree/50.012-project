"use client";

import { useEffect, useState } from "react";
import { CrowdsourcedResult } from "@/lib/metrics";

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
  const [showModal, setShowModal] = useState(false);
  const [dbRows, setDbRows] = useState<CrowdsourcedResult[]>([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/results?aggregate=true")
      .then((res) => res.json())
      .then((data) => setStats(data.stats ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openModal = async () => {
    setShowModal(true);
    setDbLoading(true);
    setDbError(null);

    try {
      const res = await fetch("/api/results?limit=100");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load database rows");
      }

      setDbRows(data.results ?? []);
      setDbTotal(data.total ?? 0);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : String(err));
    } finally {
      setDbLoading(false);
    }
  };

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
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-300">
          Community Benchmarks
        </h2>
        <button
          onClick={openModal}
          className="px-3 py-1.5 text-xs rounded-md border border-gray-700 text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
        >
          View DB Rows
        </button>
      </div>
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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-6xl max-h-[85vh] overflow-hidden rounded-xl border border-gray-700 bg-gray-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-gray-200">
                Raw database rows ({dbRows.length}/{dbTotal})
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {dbLoading ? (
              <div className="p-6 text-sm text-gray-500">Loading database rows...</div>
            ) : dbError ? (
              <div className="p-6 text-sm text-red-400">{dbError}</div>
            ) : dbRows.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No rows found in the database.</div>
            ) : (
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-900/80 text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Provider</th>
                      <th className="px-3 py-2 text-left">Model</th>
                      <th className="px-3 py-2 text-right">TPS</th>
                      <th className="px-3 py-2 text-right">TTFB</th>
                      <th className="px-3 py-2 text-right">Latency</th>
                      <th className="px-3 py-2 text-right">Out</th>
                      <th className="px-3 py-2 text-right">In</th>
                      <th className="px-3 py-2 text-center">Cache</th>
                      <th className="px-3 py-2 text-left">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbRows.map((row) => (
                      <tr key={row.id ?? `${row.provider}-${row.model}-${row.timestamp}`} className="border-t border-gray-800 text-gray-300">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                          {new Date(row.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-medium">{row.provider}</td>
                        <td className="px-3 py-2 text-gray-500">{row.model}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.tps.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.ttfb.toFixed(0)} ms</td>
                        <td className="px-3 py-2 text-right tabular-nums">{(row.totalLatency / 1000).toFixed(2)}s</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.outputTokens}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.inputTokens}</td>
                        <td className="px-3 py-2 text-center uppercase">{row.cacheStatus}</td>
                        <td className="px-3 py-2">{row.userCountry || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
