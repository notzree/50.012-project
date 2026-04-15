"use client";

import { useState } from "react";
import { ProviderConfig } from "@/lib/providers";

const STORAGE_KEY = "ai-speedtest-keys";

interface ApiKeyManagerProps {
  providers: ProviderConfig[];
  apiKeys: Record<string, string>;
  onKeysChange: (keys: Record<string, string>) => void;
}

export function loadApiKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveApiKeys(keys: Record<string, string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export default function ApiKeyManager({
  providers,
  apiKeys,
  onKeysChange,
}: ApiKeyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const handleChange = (providerId: string, value: string) => {
    const next = { ...apiKeys, [providerId]: value };
    if (!value) delete next[providerId];
    onKeysChange(next);
    saveApiKeys(next);
  };

  const toggleVisibility = (providerId: string) => {
    setVisible((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const keyCount = Object.values(apiKeys).filter(Boolean).length;

  return (
    <div className="w-full max-w-2xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        API Keys
        {keyCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
            {keyCount} set
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-600 mb-2">
            Keys are stored in your browser only and sent over HTTPS for benchmarking.
          </p>
          {providers.map((provider) => (
            <div key={provider.id} className="flex items-center gap-2">
              <label className="w-28 text-sm text-gray-400 shrink-0">
                {provider.name}
              </label>
              <div className="relative flex-1">
                <input
                  type={visible[provider.id] ? "text" : "password"}
                  value={apiKeys[provider.id] || ""}
                  onChange={(e) => handleChange(provider.id, e.target.value)}
                  placeholder={provider.envKey}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(provider.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                >
                  {visible[provider.id] ? "hide" : "show"}
                </button>
              </div>
              {apiKeys[provider.id] && (
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
