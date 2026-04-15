"use client";

interface StartButtonProps {
  onClick: () => void;
  isRunning: boolean;
  label?: string;
}

export default function StartButton({
  onClick,
  isRunning,
  label,
}: StartButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      className={`relative px-8 py-3 rounded-full font-semibold text-base transition-all duration-200 ${
        isRunning
          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
          : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95"
      }`}
    >
      {isRunning ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Running...
        </span>
      ) : (
        label || "Start Test"
      )}
    </button>
  );
}
