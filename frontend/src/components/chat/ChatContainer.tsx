"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { queryRAG } from "@/lib/api";
import ChatInput from "./ChatInput";
import MessageBubble, { type Source } from "./MessageBubble";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidenceScore?: number;
  responseTimeMs?: number;
}

interface ChatContainerProps {
  sessionId: string;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-[#1e293b] px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatContainer({ sessionId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (text: string) => {
      setError(null);
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await queryRAG(text, sessionId);
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          confidenceScore: response.confidence_score,
          responseTimeMs: response.response_time_ms,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError("⚠️ Cannot connect to backend. Please try again later.");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "⚠️ Cannot connect to backend. Please try again later.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-1 py-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-indigo/10 p-6">
              <MessageSquare className="h-12 w-12 text-indigo" />
            </div>
            <p className="text-lg text-slate-400">
              Ask anything about your company documents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
                confidenceScore={msg.confidenceScore}
                responseTimeMs={msg.responseTimeMs}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-4 shrink-0">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
