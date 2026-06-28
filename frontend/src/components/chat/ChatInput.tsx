"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (msg: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 5;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  const handleSend = () => {
    const value = textareaRef.current?.value.trim();
    if (!value || isLoading) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return (
    <div className="flex items-end gap-3 rounded-xl border border-slate-700 bg-[#1e293b] p-3">
      <Textarea
        ref={textareaRef}
        placeholder="Ask a question about your company documents..."
        disabled={isLoading}
        rows={1}
        onChange={adjustHeight}
        onKeyDown={handleKeyDown}
        className="min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent text-slate-200 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        onClick={handleSend}
        disabled={isLoading}
        className="shrink-0 bg-indigo hover:bg-indigo/90"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
