"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { AdminMediaRecord } from "./types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
]);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface MediaLibraryPanelProps {
  media: readonly AdminMediaRecord[];
  loading: boolean;
  onMediaUploaded: (item: AdminMediaRecord) => void;
  onMediaDeleted: (id: string) => void;
  onSelectMedia?: (item: AdminMediaRecord) => void;
  onNotify: (message: string, variant?: "success" | "error") => void;
}

export function MediaLibraryPanel({
  media,
  loading,
  onMediaUploaded,
  onMediaDeleted,
  onSelectMedia,
  onNotify,
}: MediaLibraryPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileList = Array.from(files);
      if (fileList.length === 0) return;

      for (const file of fileList) {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
          onNotify(
            `Skipped "${file.name}": only PNG, JPEG, WebP, AVIF, or GIF are supported.`,
            "error"
          );
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          onNotify(
            `Skipped "${file.name}": exceeds 2 MB limit (${formatBytes(file.size)}).`,
            "error"
          );
          continue;
        }

        setUploadingCount((c) => c + 1);
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/cms/media", {
            method: "POST",
            body: formData,
          });
          const data = (await response.json().catch(() => ({}))) as {
            media?: AdminMediaRecord;
            error?: string;
          };

          if (!response.ok || !data.media) {
            onNotify(
              data.error || `Failed to upload "${file.name}".`,
              "error"
            );
            continue;
          }

          onMediaUploaded(data.media);
          onNotify(`Uploaded "${data.media.filename}".`, "success");
        } catch {
          onNotify(`Network error uploading "${file.name}".`, "error");
        } finally {
          setUploadingCount((c) => Math.max(0, c - 1));
        }
      }
    },
    [onMediaUploaded, onNotify]
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  };

  const handleCopyUrl = async (item: AdminMediaRecord) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      onNotify(`Copied URL: ${item.url}`, "success");
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 2000);
    } catch {
      onNotify("Could not copy URL to clipboard.", "error");
    }
  };

  const handleDelete = async (item: AdminMediaRecord) => {
    if (!window.confirm(`Delete media "${item.filename}" permanently?`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/cms/media/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        onNotify(data.error || "Failed to delete media.", "error");
        return;
      }
      onMediaDeleted(item.id);
      onNotify(`Deleted "${item.filename}".`, "success");
    } catch {
      onNotify("Network error deleting media.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag and drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-card border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? "border-brand-orange bg-brand-orange/5"
            : "border-brand-border bg-brand-grayBg/50 hover:border-brand-blue"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) {
              void uploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-blue shadow-sm ring-1 ring-brand-border">
          {uploadingCount > 0 ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-orange" aria-hidden="true" />
          ) : (
            <Upload className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <p className="text-sm font-semibold text-brand-textMain">
          {uploadingCount > 0
            ? `Uploading ${uploadingCount} file${uploadingCount > 1 ? "s" : ""}...`
            : "Drag & drop product images here"}
        </p>
        <p className="mt-1 text-xs text-brand-textMuted">
          PNG, JPEG, WebP, AVIF, or GIF up to 2 MB each
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingCount > 0}
          className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-brand-blue px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          <span>Select Files to Upload</span>
        </button>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-card border border-brand-border bg-white p-10 text-xs text-brand-textMuted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading media library...</span>
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-card border border-brand-border bg-white p-10 text-center">
          <p className="text-sm font-semibold text-brand-textMain">
            No uploaded images yet
          </p>
          <p className="mt-1 text-xs text-brand-textMuted">
            Upload product photos above to generate persistent{" "}
            <code className="font-mono">/api/cms/media/&lt;id&gt;</code> URLs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {media.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-card border border-brand-border bg-white shadow-sm"
            >
              <div className="relative h-32 w-full border-b border-brand-border/60 bg-slate-50">
                <Image
                  src={item.url}
                  alt={item.filename}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-contain p-2"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2.5">
                <div>
                  <p
                    className="truncate text-xs font-semibold text-brand-textMain"
                    title={item.filename}
                  >
                    {item.filename}
                  </p>
                  <p className="text-[11px] text-brand-textMuted tabular-nums">
                    {formatBytes(item.sizeBytes)}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-1.5">
                  {onSelectMedia ? (
                    <button
                      type="button"
                      onClick={() => onSelectMedia(item)}
                      className="inline-flex flex-1 items-center justify-center rounded-control bg-brand-orange px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand-orangeHover"
                    >
                      Use Image
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleCopyUrl(item)}
                    aria-label={`Copy URL for ${item.filename}`}
                    className="inline-flex items-center justify-center gap-1 rounded-control border border-brand-border bg-white px-2 py-1 text-[11px] font-medium text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    disabled={deletingId === item.id}
                    aria-label={`Delete ${item.filename}`}
                    className="inline-flex items-center justify-center rounded-control border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface MediaLibraryModalProps {
  open: boolean;
  onClose: () => void;
  media: readonly AdminMediaRecord[];
  loading: boolean;
  onMediaUploaded: (item: AdminMediaRecord) => void;
  onMediaDeleted: (id: string) => void;
  onSelectMedia: (item: AdminMediaRecord) => void;
  onNotify: (message: string, variant?: "success" | "error") => void;
}

export function MediaLibraryModal({
  open,
  onClose,
  media,
  loading,
  onMediaUploaded,
  onMediaDeleted,
  onSelectMedia,
  onNotify,
}: MediaLibraryModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-library-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/60 p-4 backdrop-blur-[1px]"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-card border border-brand-border bg-white shadow-dock">
        <div className="flex items-center justify-between border-b border-brand-border bg-brand-navy px-5 py-3.5 text-white">
          <h2 id="media-library-modal-title" className="text-sm font-bold">
            Media Library — Select or Upload Product Image
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media library"
            className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <MediaLibraryPanel
            media={media}
            loading={loading}
            onMediaUploaded={onMediaUploaded}
            onMediaDeleted={onMediaDeleted}
            onSelectMedia={(item) => {
              onSelectMedia(item);
              onClose();
            }}
            onNotify={onNotify}
          />
        </div>
      </div>
    </div>
  );
}
