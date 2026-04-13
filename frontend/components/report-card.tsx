"use client";
import { StatusBadge } from "./status-badge";
import type { QAReport } from "@/lib/types";

export function ReportCard({ report }: { report: QAReport }) {
  const date = new Date(report.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={report.overallStatus} />
          {report.appUrl && (
            <span className="text-xs text-zinc-500 truncate max-w-[200px]">{report.appUrl}</span>
          )}
        </div>
        <span className="text-xs text-zinc-600">{dateStr} {timeStr}</span>
      </div>

      {/* Results checklist */}
      <div className="space-y-1">
        {report.results.map((r) => (
          <div key={r.name} className="flex items-center gap-2 text-sm">
            {r.status === "PASS" ? (
              <span className="text-emerald-400">&#10003;</span>
            ) : r.status === "FAIL" || r.status === "ERROR" ? (
              <span className="text-red-400">&#10007;</span>
            ) : (
              <span className="text-zinc-600">&#8212;</span>
            )}
            <span className={r.status === "PASS" ? "text-zinc-300" : r.status === "FAIL" ? "text-red-300" : "text-zinc-500"}>
              {r.name}
            </span>
            <span className="text-xs text-zinc-600 ml-auto">{(r.durationMs / 1000).toFixed(1)}s</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-600 pt-1 border-t border-zinc-800/50">
        <span>{report.spendSummary}</span>
        <span>{report.results.length} tests</span>
      </div>
    </div>
  );
}
