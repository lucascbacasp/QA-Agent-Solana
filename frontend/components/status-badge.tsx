import type { TestStatus } from "@/lib/types";

const STYLES: Record<TestStatus, string> = {
  PASS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  FAIL: "bg-red-500/20 text-red-400 border-red-500/30",
  ERROR: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  SKIP: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export function StatusBadge({ status }: { status: TestStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STYLES[status]}`}>
      {status}
    </span>
  );
}
