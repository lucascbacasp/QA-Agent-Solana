"use client";
import { TestStepItem } from "./test-step-item";
import type { StepState } from "@/hooks/use-test-runner";
import type { RunnerStatus } from "@/hooks/use-test-runner";

interface Props {
  steps: StepState[];
  progress: number;
  status: RunnerStatus;
}

export function TestStepper({ steps, progress, status }: Props) {
  if (status === "idle") {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        Enter a URL above to run real on-chain tests
      </div>
    );
  }

  const passCount = steps.filter((s) => s.result?.status === "PASS").length;
  const failCount = steps.filter((s) => s.result?.status === "FAIL" || s.result?.status === "ERROR").length;
  const skipCount = steps.filter((s) => s.result?.status === "SKIP").length;

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
          <TestStepItem key={step.name} step={step} />
        ))}
      </div>

      {/* Summary */}
      {(status === "done" || status === "failed") && (
        <div className={`mt-3 p-3 rounded-lg text-sm text-center ${
          status === "done"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          <p className="font-medium">
            {status === "done" ? "All tests passed" : "Some tests failed"}
          </p>
          <p className="text-xs mt-1 opacity-70">
            {passCount} passed · {failCount} failed · {skipCount} skipped · Click each step to see details
          </p>
        </div>
      )}
    </div>
  );
}
