"use client";
import { useReducer, useCallback, useRef } from "react";
import { createTestSteps } from "@/lib/test-steps";
import { saveReport } from "@/lib/store";
import type { UITestStep, StepStatus, QAReport } from "@/lib/types";

type RunnerStatus = "idle" | "running" | "done" | "failed";

interface State {
  steps: UITestStep[];
  currentIndex: number;
  status: RunnerStatus;
  url: string;
  report: QAReport | null;
}

type Action =
  | { type: "START"; url: string }
  | { type: "ADVANCE" }
  | { type: "STEP_FAIL"; error: string }
  | { type: "COMPLETE" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START": {
      const steps = createTestSteps();
      steps[0].status = "running";
      return { ...state, steps, currentIndex: 0, status: "running", url: action.url, report: null };
    }
    case "ADVANCE": {
      const steps = [...state.steps];
      steps[state.currentIndex] = { ...steps[state.currentIndex], status: "done" };
      const nextIndex = state.currentIndex + 1;
      if (nextIndex < steps.length) {
        steps[nextIndex] = { ...steps[nextIndex], status: "running" };
        return { ...state, steps, currentIndex: nextIndex };
      }
      return { ...state, steps, currentIndex: nextIndex, status: "done" };
    }
    case "STEP_FAIL": {
      const steps = [...state.steps];
      steps[state.currentIndex] = { ...steps[state.currentIndex], status: "failed" };
      return { ...state, steps, status: "failed" };
    }
    case "COMPLETE": {
      const report: QAReport = {
        timestamp: new Date().toISOString(),
        walletAddress: "GxQYMQTMKYFWHUbgWhaBjsBxtZCiLA8t3JLQaceab6b5",
        spendSummary: "Simulated test",
        appUrl: state.url,
        overallStatus: state.status === "failed" ? "FAIL" : "PASS",
        results: state.steps.map((s) => ({
          name: s.id,
          status: s.status === "done" ? "PASS" as const : s.status === "failed" ? "FAIL" as const : "SKIP" as const,
          durationMs: s.durationMs,
          details: { step: s.label },
        })),
      };
      saveReport(report);
      return { ...state, report };
    }
    case "RESET":
      return { steps: createTestSteps(), currentIndex: 0, status: "idle", url: "", report: null };
    default:
      return state;
  }
}

export function useTestRunner() {
  const [state, dispatch] = useReducer(reducer, {
    steps: createTestSteps(),
    currentIndex: 0,
    status: "idle",
    url: "",
    report: null,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const runNextStep = useCallback(() => {
    dispatch({ type: "ADVANCE" });
  }, []);

  const start = useCallback(
    (url: string) => {
      dispatch({ type: "START", url });
      // Start stepping through with delays
      let stepIndex = 0;
      const steps = createTestSteps();

      const step = () => {
        if (stepIndex >= steps.length) {
          dispatch({ type: "COMPLETE" });
          return;
        }
        timerRef.current = setTimeout(() => {
          dispatch({ type: "ADVANCE" });
          stepIndex++;
          step();
        }, steps[stepIndex].durationMs);
      };
      // Start after the first step's duration
      timerRef.current = setTimeout(() => {
        stepIndex++;
        dispatch({ type: "ADVANCE" });
        step();
      }, steps[0].durationMs);
    },
    [],
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dispatch({ type: "RESET" });
  }, []);

  return {
    steps: state.steps,
    currentIndex: state.currentIndex,
    status: state.status,
    url: state.url,
    report: state.report,
    start,
    reset,
    progress: state.steps.length > 0
      ? (state.steps.filter((s) => s.status === "done").length / state.steps.length) * 100
      : 0,
  };
}
