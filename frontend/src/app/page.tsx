"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import ChatContainer from "@/components/chat/ChatContainer";
import UploadModal from "@/components/admin/UploadModal";
import DocManager from "@/components/admin/DocManager";
import AnalyticsView from "@/components/admin/AnalyticsView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "admin">("chat");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0b0f19]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo/10 p-2">
              <Sparkles className="h-5 w-5 text-indigo" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">Enterprise AI</span>
              <span className="ml-2 text-lg text-slate-400">Document Search</span>
            </div>
          </div>

          <div className="flex gap-2 rounded-full bg-slate-800/50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-indigo text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Employee Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "admin"
                  ? "bg-indigo text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Admin Hub
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6">
        <div
          className={`flex flex-1 flex-col ${activeTab === "chat" ? "block" : "hidden"}`}
        >
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-white">Ask Your Documents</h1>
            <p className="text-slate-400">
              Powered by RAG — every answer is sourced and verified
            </p>
          </div>
          <div className="flex-1 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
            <ChatContainer sessionId={sessionId} />
          </div>
        </div>

        <div
          className={`flex-1 ${activeTab === "admin" ? "block" : "hidden"}`}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Admin Control Center</h1>
            <p className="text-slate-400">Manage your knowledge base</p>
          </div>

          <div className="mb-6">
            <UploadModal onSuccess={() => setRefreshKey((k) => k + 1)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DocManager refreshKey={refreshKey} />
            <AnalyticsView />
          </div>
        </div>
      </main>
    </div>
  );
}
