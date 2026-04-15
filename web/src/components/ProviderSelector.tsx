"use client";

import { ProviderConfig } from "@/lib/providers";

interface ProviderSelectorProps {
  providers: ProviderConfig[];
  selected: string | null;
  onSelect: (id: string) => void;
  disabled: boolean;
}

export default function ProviderSelector({
  providers,
  selected,
  onSelect,
  disabled,
}: ProviderSelectorProps) {
  if (providers.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">No providers configured.</p>
        <p className="text-xs mt-1">
          Add API keys to <code className="text-gray-400">.env.local</code> to
          get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => onSelect(provider.id)}
          disabled={disabled}
          className={`flex flex-col items-center px-5 py-3 rounded-xl border transition-all duration-200 ${
            selected === provider.id
              ? "border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10"
              : "border-gray-700 bg-gray-900/40 text-gray-300 hover:border-gray-500 hover:bg-gray-800/60"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className="font-medium text-sm">{provider.name}</span>
          <span className="text-xs text-gray-500 mt-0.5">{provider.model}</span>
        </button>
      ))}
    </div>
  );
}
