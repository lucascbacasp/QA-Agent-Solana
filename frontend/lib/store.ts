import type { QAReport } from "./types";

const STORAGE_KEY = "mpsol-qa-reports";

export function saveReport(report: QAReport): void {
  if (typeof window === "undefined") return;
  const existing = loadReports();
  existing.unshift(report);
  // Keep last 20 reports
  const trimmed = existing.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function loadReports(): QAReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearReports(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
