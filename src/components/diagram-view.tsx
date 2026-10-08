"use client";

import { DiagramBlock } from "@/lib/types";

/** Lightweight visual when Mermaid cannot render — shows structured lines. */
export function DiagramView({ diagram }: { diagram: DiagramBlock }) {
  const lines = diagram.mermaid
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 16);

  if (!lines.length) {
    return (
      <p className="mt-2 text-sm text-[#1B1028]/70">
        {diagram.title || "Diagram"} could not be drawn. See the lesson text
        above.
      </p>
    );
  }

  return (
    <div className="mt-2 w-full max-w-md rounded-2xl border border-[#F2C14E]/60 bg-[#FFF8EF] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#5C2D91]">
          {diagram.title || "Visual"}
        </h3>
        <span className="rounded-full bg-[#CDB4E8]/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#1B1028]/70">
          {diagram.kind}
        </span>
      </div>
      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li
            key={`${i}-${line}`}
            className="rounded-xl bg-gradient-to-r from-[#CDB4E8]/40 to-[#F3B6C8]/30 px-3 py-2 text-xs text-[#1B1028]"
          >
            {line.replace(/^(flowchart|mindmap|timeline)\b/i, "").trim() ||
              line}
          </li>
        ))}
      </ol>
    </div>
  );
}
