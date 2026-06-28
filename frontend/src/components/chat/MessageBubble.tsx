"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import CitationModal from "./CitationModal";

export interface Source {
  filename: string;
  page: number;
  excerpt: string;
  relevance_score: number;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidenceScore?: number;
  responseTimeMs?: number;
}

function getConfidenceBadgeClass(score: number): string {
  if (score >= 85) return "bg-emerald/20 text-emerald border-emerald/30";
  if (score >= 70) return "bg-amber/20 text-amber border-amber/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

export default function MessageBubble({
  role,
  content,
  sources,
  confidenceScore,
  responseTimeMs,
}: MessageBubbleProps) {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#1e293b] px-4 py-3">
          <p className="whitespace-pre-wrap text-white">{content}</p>

          {sources && sources.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-slate-700 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Sources
                </span>
                {confidenceScore !== undefined && (
                  <Badge
                    variant="outline"
                    className={getConfidenceBadgeClass(confidenceScore)}
                  >
                    {confidenceScore.toFixed(0)}% confidence
                  </Badge>
                )}
                {responseTimeMs !== undefined && (
                  <span className="text-xs text-slate-500">
                    Response: {responseTimeMs}ms
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {sources.map((source, idx) => (
                  <button
                    key={`${source.filename}-${source.page}-${idx}`}
                    type="button"
                    onClick={() => setSelectedSource(source)}
                    className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-left text-xs text-slate-300 transition-colors hover:border-indigo/50 hover:bg-indigo/10"
                  >
                    📄 {source.filename} • Page {source.page} •{" "}
                    {(source.relevance_score * 100).toFixed(0)}% match
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedSource && (
        <CitationModal
          source={selectedSource}
          open={!!selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </>
  );
}
