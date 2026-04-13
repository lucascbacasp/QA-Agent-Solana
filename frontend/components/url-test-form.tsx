"use client";
import { useState } from "react";

interface Props {
  onStart: (url: string) => void;
  onReset: () => void;
  isRunning: boolean;
  isDone: boolean;
}

export function UrlTestForm({ onStart, onReset, isRunning, isDone }: Props) {
  const [url, setUrl] = useState("https://sol.metapool.app/");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isRunning) return;
    try {
      new URL(url);
      onStart(url.trim());
    } catch {
      // Invalid URL
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Test Runner</h2>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://sol.metapool.app/"
          disabled={isRunning}
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-teal-500/50 disabled:opacity-50 transition-colors"
        />
        {isDone ? (
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Reset
          </button>
        ) : (
          <button
            type="submit"
            disabled={isRunning || !url.trim()}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Testing...
              </span>
            ) : (
              "Run Test"
            )}
          </button>
        )}
      </div>
    </form>
  );
}
