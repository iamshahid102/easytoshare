"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CloseIcon, DownloadIcon, FileGlyph, PlusIcon } from "@/components/icons";
import {
  absoluteUrl,
  deleteFile,
  describeError,
  uploadFile,
  type ClipState,
} from "@/lib/api";
import { MAX_FILES, MAX_SIZE_MB } from "@/lib/limits";

interface Props {
  clip: ClipState | null;
  onRefresh: () => Promise<void>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPanel({ clip, onRefresh }: Props) {
  const files = clip?.clipFiles ?? [];
  const maxFiles = clip?.maxFilesCount ?? MAX_FILES;
  const maxSizeMb = clip?.maxFileSize ?? MAX_SIZE_MB;

  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      // Sequential so the server enforces the quota in order.
      for (const file of Array.from(list)) {
        await uploadFile(file);
      }
      await onRefresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = async (id: string) => {
    setError(null);
    try {
      await deleteFile(id);
      await onRefresh();
    } catch (err) {
      setError(describeError(err));
    }
  };

  const downloadAll = () => {
    for (const file of files) {
      const anchor = document.createElement("a");
      anchor.href = absoluteUrl(file.url);
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
  };

  const pickFiles = () => inputRef.current?.click();

  const dropHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
    },
    onDragLeave: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragging(false);
      }
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void addFiles(event.dataTransfer.files);
    },
  };

  const overLimit = files.length > maxFiles;

  return (
    <div className="relative" {...dropHandlers}>
      <h1 className="mb-7 text-[34px] font-bold leading-[0.85] tracking-[0.6px] text-heading max-md:absolute max-md:-top-[55px] max-md:left-3 max-md:mb-0 md:text-[48px]">
        Files
      </h1>

      {files.length === 0 ? (
        <div
          className={`flex h-[280px] flex-col items-center justify-center border border-dashed text-center text-[16px] font-light leading-[1.88] tracking-[-0.3px] text-muted ${
            dragging ? "border-focus" : "border-line-dashed"
          }`}
        >
          <p className="px-6">
            Drag and drop any files up to {maxFiles} files, {maxSizeMb}Mbs each
            or{" "}
            <button
              type="button"
              onClick={pickFiles}
              className="cursor-pointer border-none bg-transparent p-0 text-accent"
            >
              Browse
            </button>
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-muted">
            <span>
              {files.length} {files.length === 1 ? "file" : "files"}
              {busy ? " · Uploading…" : ""}
            </span>
            <button
              type="button"
              onClick={downloadAll}
              className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-bold text-ink hover:text-accent"
            >
              <DownloadIcon className="h-4 w-4" />
              Download All
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-2 min-[370px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {files.map((file) => {
              const href = absoluteUrl(file.url);
              const isImage = file.mime.startsWith("image/");
              return (
                <li
                  key={file.id}
                  className="group relative aspect-square overflow-hidden border border-line bg-surface-alt"
                >
                  <a
                    href={href}
                    download={file.name}
                    title={`${file.name} (${formatSize(file.size)})`}
                    className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-3 text-center transition-colors hover:bg-page"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={href}
                        alt={file.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <FileGlyph className="h-10 w-8 text-muted" />
                        <span className="line-clamp-2 break-all text-xs text-ink">
                          {file.name}
                        </span>
                      </>
                    )}
                  </a>

                  {file.owner ? (
                    <button
                      type="button"
                      onClick={() => void removeFile(file.id)}
                      aria-label={`Remove ${file.name}`}
                      className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-inverse/70 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              );
            })}

            <li className="relative aspect-square border border-dashed border-line-dashed">
              <button
                type="button"
                onClick={pickFiles}
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 border-none bg-transparent p-3 text-center text-xs leading-relaxed tracking-[-0.4px] text-muted"
              >
                <PlusIcon className="h-[18px] w-[18px]" />
                Add files up to {maxFiles} files, {maxSizeMb}Mbs each
              </button>
            </li>
          </ul>

          {overLimit ? (
            <p className="mt-4 text-center text-sm text-muted">
              <Link href="/upgrade" className="text-accent hover:text-accent-hover">
                Upgrade
              </Link>{" "}
              to get more space 🎁
            </p>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="mt-3 text-center text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => void addFiles(event.target.files)}
      />
    </div>
  );
}
