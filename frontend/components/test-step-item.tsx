"use client";
import { useState } from "react";
import type { StepState } from "@/hooks/use-test-runner";
import { StatusBadge } from "./status-badge";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <span className="w-4 h-4 rounded-full border-2 border-zinc-700 inline-block shrink-0" />,
  running: <span className="w-4 h-4 rounded-full bg-blue-500 inline-block animate-pulse shrink-0" />,
  done: (
    <span className="w-4 h-4 rounded-full bg-emerald-500 inline-flex items-center justify-center shrink-0">
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ),
  failed: (
    <span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center shrink-0">
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  ),
};

export function TestStepItem({ step }: { step: StepState }) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = step.result != null;
  const textColor = {
    pending: "text-zinc-600",
    running: "text-blue-300",
    done: "text-zinc-300",
    failed: "text-red-300",
  }[step.status];

  return (
    <div className={`transition-colors duration-300 ${textColor}`}>
      <button
        onClick={() => hasResult && setExpanded(!expanded)}
        disabled={!hasResult}
        className="flex items-center gap-3 py-1.5 w-full text-left"
      >
        {STATUS_ICON[step.status]}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{step.label}</p>
        </div>
        {step.result && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-600">{(step.result.durationMs / 1000).toFixed(1)}s</span>
            <StatusBadge status={step.result.status} />
          </div>
        )}
        {step.status === "running" && (
          <span className="text-xs text-blue-400 animate-pulse shrink-0">Running...</span>
        )}
      </button>

      {/* Expandable details */}
      {expanded && step.result && (
        <div className="ml-7 mb-2 p-2 rounded-lg bg-zinc-800/50 text-xs space-y-1 animate-slideUp">
          {step.result.error && (
            <p className="text-red-400">{step.result.error}</p>
          )}
          {step.result.details && Object.entries(step.result.details).map(([key, val]) => (
            <div key={key} className="flex justify-between">
              <span className="text-zinc-500">{key}</span>
              <span className="text-zinc-300 font-mono">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
