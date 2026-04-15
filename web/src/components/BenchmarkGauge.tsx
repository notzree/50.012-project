"use client";

interface BenchmarkGaugeProps {
  value: number;
  isRunning: boolean;
  maxValue?: number;
}

export default function BenchmarkGauge({
  value,
  isRunning,
  maxValue = 200,
}: BenchmarkGaugeProps) {
  const clampedValue = Math.min(value, maxValue);
  const percentage = clampedValue / maxValue;
  const strokeDasharray = 251.2; // circumference of arc (r=80, ~180deg)
  const strokeDashoffset = strokeDasharray * (1 - percentage);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        viewBox="0 0 200 120"
        className="w-72 h-44 sm:w-96 sm:h-56"
        aria-label={`Speed gauge showing ${Math.round(value)} tokens per second`}
      >
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <span
          className={`text-5xl sm:text-6xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${
            isRunning ? "text-white" : "text-gray-300"
          }`}
        >
          {Math.round(value)}
        </span>
        <span className="text-sm text-gray-500 mt-1 uppercase tracking-widest">
          tokens/sec
        </span>
      </div>
    </div>
  );
}
