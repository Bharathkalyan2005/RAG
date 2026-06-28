"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { uploadDocument } from "@/lib/api";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

interface UploadModalProps {
  onSuccess?: () => void;
}

function isValidFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  return (
    ALLOWED_EXTENSIONS.includes(ext) ||
    ALLOWED_TYPES.includes(file.type)
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadModal({ onSuccess }: UploadModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ chunks: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setSuccess(null);
  };

  const handleFileSelect = (file: File) => {
    if (!isValidFile(file)) {
      setError("Only PDF, DOCX, and TXT files are supported.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setProgress(0);
    setError(null);

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await uploadDocument(selectedFile);
      clearInterval(interval);
      setProgress(100);
      setSuccess({ chunks: result.chunks_indexed });
      onSuccess?.();
    } catch {
      clearInterval(interval);
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="bg-indigo hover:bg-indigo/90" />
        }
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload Document
      </DialogTrigger>
      <DialogContent className="border-slate-700 bg-[#1e293b] text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-white">Upload & Index Document</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-indigo bg-indigo/10"
              : "border-slate-600 hover:border-indigo/50 hover:bg-indigo/5"
          }`}
        >
          <Upload className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-300">
            Drag & drop a file here, or click to browse
          </p>
          <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>

        {selectedFile && (
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
            <p className="text-sm font-medium text-white">{selectedFile.name}</p>
            <p className="text-xs text-slate-400">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        )}

        {isUploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2 bg-slate-700" />
            <p className="text-center text-xs text-slate-400">Indexing document...</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald/10 p-3 text-emerald">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">
              Document indexed successfully! Chunks: {success.chunks}
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
            <XCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!success && (
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full bg-indigo hover:bg-indigo/90"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload & Index"
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
