"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Source } from "./MessageBubble";

interface CitationModalProps {
  source: Source;
  open: boolean;
  onClose: () => void;
}

export default function CitationModal({
  source,
  open,
  onClose,
}: CitationModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[80vh] border-slate-700 bg-[#1e293b] text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-white">
            {source.filename} — Page {source.page}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Relevance score</span>
              <span>{(source.relevance_score * 100).toFixed(0)}%</span>
            </div>
            <Progress
              value={source.relevance_score * 100}
              className="h-2 bg-slate-700"
            />
          </div>

          <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-slate-600 bg-slate-900/50 p-4">
            <p className="font-mono-citation whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {source.excerpt}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
