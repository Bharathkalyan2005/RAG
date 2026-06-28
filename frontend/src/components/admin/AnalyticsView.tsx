"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Clock, Loader2, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAnalytics } from "@/lib/api";

interface AnalyticsData {
  total_queries: number;
  average_response_time_ms: number;
  average_confidence_score: number;
  popular_documents: { document: string; query_count: number }[];
}

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const result = await getAnalytics();
      setData(result);
      setError(null);
    } catch {
      setData(null);
      setError("⚠️ Cannot load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const maxQueryCount =
    data?.popular_documents.reduce(
      (max, doc) => Math.max(max, doc.query_count),
      0
    ) ?? 0;

  const statTiles = [
    {
      label: "Total Queries",
      value: data?.total_queries ?? 0,
      icon: Search,
    },
    {
      label: "Avg Response Time",
      value: `${data?.average_response_time_ms ?? 0}ms`,
      icon: Clock,
    },
    {
      label: "Avg Confidence",
      value: `${data?.average_confidence_score ?? 0}%`,
      icon: BarChart3,
    },
  ];

  return (
    <Card className="border-slate-700 bg-[#1e293b]">
      <CardHeader>
        <CardTitle className="text-white">Analytics Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-red-400">{error}</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {statTiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-slate-400">
                    <tile.icon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      {tile.label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">{tile.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
                Most Searched Documents
              </h3>
              {data?.popular_documents && data.popular_documents.length > 0 ? (
                <div className="space-y-3">
                  {data.popular_documents.map((doc, idx) => (
                    <div key={doc.document} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">
                          <span className="mr-2 font-mono text-indigo">
                            #{idx + 1}
                          </span>
                          {doc.document}
                        </span>
                        <span className="text-slate-500">
                          {doc.query_count} queries
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-indigo transition-all"
                          style={{
                            width: `${
                              maxQueryCount > 0
                                ? (doc.query_count / maxQueryCount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No search data yet. Queries will appear here once employees start
                  asking questions.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
