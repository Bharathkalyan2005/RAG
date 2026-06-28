"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteDocument, getDocuments } from "@/lib/api";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_timestamp: string;
  chunk_count: number;
  status: "INDEXING" | "COMPLETED" | "FAILED";
}

interface DocManagerProps {
  refreshKey?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTypeBadgeClass(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "docx":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function getStatusBadge(status: Document["status"]) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge variant="outline" className="border-emerald/30 bg-emerald/20 text-emerald">
          COMPLETED
        </Badge>
      );
    case "INDEXING":
      return (
        <Badge variant="outline" className="border-amber/30 bg-amber/20 text-amber">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          INDEXING
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="outline" className="border-red-500/30 bg-red-500/20 text-red-400">
          FAILED
        </Badge>
      );
  }
}

export default function DocManager({ refreshKey = 0 }: DocManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch {
      setDocuments([]);
      setError("⚠️ Cannot load documents. Backend may be offline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshKey]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      fetchDocuments();
    } catch {
      // keep dialog open on error
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-slate-700 bg-[#1e293b]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Indexed Documents</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-red-400">{error}</p>
          ) : documents.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              No documents indexed yet. Upload your first document above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="pb-3 pr-4 font-medium">Filename</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Size</th>
                    <th className="pb-3 pr-4 font-medium">Chunks</th>
                    <th className="pb-3 pr-4 font-medium">Uploaded</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-700/50 text-slate-300"
                    >
                      <td className="py-3 pr-4 max-w-[200px] truncate">
                        {doc.filename}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={getTypeBadgeClass(doc.file_type)}
                        >
                          {doc.file_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{formatFileSize(doc.file_size)}</td>
                      <td className="py-3 pr-4">{doc.chunk_count}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatDate(doc.upload_timestamp)}
                      </td>
                      <td className="py-3 pr-4">{getStatusBadge(doc.status)}</td>
                      <td className="py-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(doc)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="border-slate-700 bg-[#1e293b] text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Document</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{deleteTarget?.filename}&quot;?
              This will remove all indexed chunks from the vector store.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
