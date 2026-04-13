"use client";
import { TestStepItem } from "./test-step-item";
import type { UITestStep } from "@/lib/types";

interface Props {
  steps: UITestStep[];
  progress: number;
  status: "idle" | "running" | "done" | "failed";
}

export function TestStepper({ steps, progress, status }: Props) {
  if (status === "idle") {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        Enter a URL above to start testing
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            status === "failed" ? "bg-red-500" : status === "done" ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-0.5">
        {steps.map((step) => (
          <TestStepItem key={step.id} step={step} />
        ))}
      </div>

      {/* Status */}
      {status === "done" && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
          All steps completed successfully
        </div>
      )}
      {status === "failed" && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          Test failed at step above
        </div>
      )}
    </div>
  );
}
