"use client";
import { useState, useEffect } from "react";
import { loadReports, clearReports } from "@/lib/store";
import { SEED_REPORTS } from "@/lib/seed-data";
import { ReportCard } from "./report-card";
import type { QAReport } from "@/lib/types";

export function ReportHistory({ newReport }: { newReport?: QAReport | null }) {
  const [reports, setReports] = useState<QAReport[]>([]);

  useEffect(() => {
    let stored = loadReports();
    if (stored.length === 0) {
      // Seed with demo data
      stored = SEED_REPORTS;
    }
    setReports(stored);
  }, []);

  // Add new report when it comes in
  useEffect(() => {
    if (newReport) {
      setReports((prev) => [newReport, ...prev.filter((r) => r.timestamp !== newReport.timestamp)]);
    }
  }, [newReport]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Test Reports</h2>
        {reports.length > 0 && (
          <button
            onClick={() => {
              clearReports();
              setReports([]);
            }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">No test reports yet</p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {reports.map((r, i) => (
            <ReportCard key={`${r.timestamp}-${i}`} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
