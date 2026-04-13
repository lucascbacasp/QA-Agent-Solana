import type { UITestStep } from "@/lib/types";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <span className="w-4 h-4 rounded-full border-2 border-zinc-700 inline-block" />,
  running: <span className="w-4 h-4 rounded-full bg-blue-500 inline-block animate-pulse" />,
  done: (
    <span className="w-4 h-4 rounded-full bg-emerald-500 inline-flex items-center justify-center">
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ),
  failed: (
    <span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center">
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  ),
};

export function TestStepItem({ step }: { step: UITestStep }) {
  const textColor = {
    pending: "text-zinc-600",
    running: "text-blue-300",
    done: "text-zinc-300",
    failed: "text-red-300",
  }[step.status];

  return (
    <div className={`flex items-center gap-3 py-1.5 transition-colors duration-300 ${textColor}`}>
      {STATUS_ICON[step.status]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{step.label}</p>
        {step.status === "running" && (
          <p className="text-xs text-zinc-500 truncate">{step.description}</p>
        )}
      </div>
    </div>
  );
}
