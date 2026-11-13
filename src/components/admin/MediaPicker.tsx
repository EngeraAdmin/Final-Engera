import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Search,
  UploadCloud,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { builtinImages, mediaUrl } from "@/lib/media-library";
import {
  listMediaServerFn,
  uploadMediaServerFn,
  UPLOAD_HELP,
  type MediaItem,
  type MediaKind,
} from "@/lib/admin-media";
import { Btn, TextInput, formatBytes } from "@/components/admin/ui";

/** Uploads one file; returns its URL or throws a friendly error. */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  let result: Awaited<ReturnType<typeof uploadMediaServerFn>>;
  try {
    result = await uploadMediaServerFn({ data: formData });
  } catch {
    throw new Error("Upload failed — check your connection and try again.");
  }
  if (!result.ok) throw new Error(result.error);
  return result.url;
}

const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
  file: "application/pdf",
};

const KIND_WORD: Record<MediaKind, string> = { image: "photo", video: "video", file: "file" };

type Tab = "uploads" | "builtin" | "link";

export function MediaPicker({
  open,
  onOpenChange,
  kind,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MediaKind;
  value?: string;
  onSelect: (value: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("uploads");
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setItems(await listMediaServerFn());
    } catch {
      setLoadError("Couldn't load your uploads.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setUploadError(null);
    setQuery("");
    setLink(value && /^(https?:)?\//.test(value) && !value.startsWith("/dev-uploads") ? value : "");
    void load();
  }, [open, load, value]);

  const uploads = useMemo(
    () =>
      (items ?? []).filter(
        (m) =>
          m.kind === kind &&
          (!query || (m.filename ?? "").toLowerCase().includes(query.toLowerCase())),
      ),
    [items, kind, query],
  );
  const builtins = useMemo(
    () =>
      kind === "image"
        ? builtinImages().filter(
            (b) =>
              b.folder !== "brand" &&
              (!query || b.name.toLowerCase().includes(query.toLowerCase())),
          )
        : [],
    [kind, query],
  );

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      let lastUrl = "";
      for (const file of list) lastUrl = await uploadFile(file);
      await load();
      setTab("uploads");
      // A single upload is chosen straight away — the quickest path.
      if (list.length === 1 && lastUrl) {
        onSelect(lastUrl);
        onOpenChange(false);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function choose(v: string) {
    onSelect(v);
    onOpenChange(false);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "uploads", label: "My uploads" },
    ...(kind === "image" ? [{ id: "builtin" as const, label: "Website photos" }] : []),
    { id: "link", label: "Use a link" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#e3e7ed] px-6 pb-0 pt-5">
          <DialogTitle className="mr-auto pb-4 text-lg font-semibold text-[#1e2635]">
            Choose a {KIND_WORD[kind]}
          </DialogTitle>
        </div>
        <div className="flex items-center gap-1 border-b border-[#e3e7ed] px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "cursor-pointer border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-[#116dff] text-[#116dff]"
                  : "border-transparent text-[#5b677b] hover:text-[#1e2635]",
              )}
            >
              {t.label}
            </button>
          ))}
          {tab !== "link" && (
            <div className="relative ml-auto hidden w-56 sm:block">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#a3adbd]" />
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-8 pl-8"
              />
            </div>
          )}
        </div>

        <div
          className={cn(
            "admin-scroll min-h-[340px] flex-1 overflow-y-auto bg-[#f7f8fa] p-5",
            dragOver && "bg-[#e7f0ff]",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          {tab === "uploads" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#9ec2ff] bg-white text-[#116dff] transition-colors hover:bg-[#f0f6ff] disabled:cursor-wait"
              >
                {uploading ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <UploadCloud className="size-6" />
                )}
                <span className="text-sm font-medium">
                  {uploading ? "Uploading…" : "Upload from computer"}
                </span>
                <span className="px-3 text-center text-[11px] text-[#7b879b]">
                  or drag files here
                </span>
              </button>
              {items === null && (
                <div className="col-span-full flex items-center gap-2 py-6 text-sm text-[#7b879b]">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              )}
              {uploads.map((m) => (
                <Tile
                  key={m.id}
                  selected={value === m.url}
                  onClick={() => choose(m.url)}
                  title={m.filename ?? ""}
                  subtitle={formatBytes(m.size)}
                  kind={m.kind}
                  src={m.url}
                />
              ))}
            </div>
          )}
          {tab === "uploads" && items !== null && uploads.length === 0 && (
            <p className="mt-6 text-center text-sm text-[#7b879b]">
              {query ? "Nothing matches that search." : `No ${KIND_WORD[kind]}s uploaded yet.`}
            </p>
          )}

          {tab === "builtin" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {builtins.map((b) => (
                <Tile
                  key={b.token}
                  selected={value === b.token}
                  onClick={() => choose(b.token)}
                  title={b.name}
                  subtitle={b.folder === "team" ? "Team photo" : "Website photo"}
                  kind="image"
                  src={b.url}
                />
              ))}
            </div>
          )}

          {tab === "link" && (
            <div className="mx-auto max-w-lg py-8">
              <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#e7f0ff] text-[#116dff]">
                <Link2 className="size-5" />
              </div>
              <p className="text-sm text-[#3b4658]">
                Paste the web address of a {KIND_WORD[kind]} that's already online.
              </p>
              <div className="mt-4 flex gap-2">
                <TextInput
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…"
                  autoFocus
                />
                <Btn variant="primary" disabled={!link.trim()} onClick={() => choose(link.trim())}>
                  Use it
                </Btn>
              </div>
              {kind === "image" && link.trim() && (
                <img
                  src={link.trim()}
                  alt=""
                  className="mt-5 max-h-56 rounded-lg border border-[#e3e7ed] object-contain"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[#e3e7ed] bg-white px-6 py-3">
          <p className="mr-auto text-xs text-[#7b879b]">
            {uploadError ? (
              <span className="text-[#e5484d]">{uploadError}</span>
            ) : (
              (loadError ?? UPLOAD_HELP)
            )}
          </p>
          <Btn size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Btn>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT[kind]}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Tile({
  src,
  title,
  subtitle,
  kind,
  selected,
  onClick,
}: {
  src: string;
  title: string;
  subtitle?: string;
  kind: MediaKind;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white text-left transition-all hover:shadow-md",
        selected
          ? "border-[#116dff] ring-2 ring-[#116dff]"
          : "border-[#e3e7ed] hover:border-[#9ec2ff]",
      )}
    >
      <div className="admin-checker relative aspect-[4/3] w-full overflow-hidden">
        <MediaThumb src={src} kind={kind} />
        {selected && (
          <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-[#116dff] text-white">
            <Check className="size-4" />
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-medium text-[#1e2635]">{title || "Untitled"}</p>
        {subtitle && <p className="text-[11px] text-[#7b879b]">{subtitle}</p>}
      </div>
    </button>
  );
}

export function MediaThumb({
  src,
  kind,
  className,
}: {
  src: string;
  kind: MediaKind;
  className?: string;
}) {
  const url = mediaUrl(src);
  if (!url) {
    return (
      <div
        className={cn("flex h-full w-full items-center justify-center text-[#a3adbd]", className)}
      >
        <ImagePlus className="size-6" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={cn("relative h-full w-full bg-black", className)}>
        <video src={url} muted preload="metadata" className="h-full w-full object-cover" />
        <Film className="absolute bottom-2 left-2 size-4 text-white drop-shadow" />
      </div>
    );
  }
  if (kind === "file") {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1 bg-[#fdf0ec] text-[#c2410c]",
          className,
        )}
      >
        <FileText className="size-8" />
        <span className="text-[10px] font-semibold uppercase">PDF</span>
      </div>
    );
  }
  return (
    <img src={url} alt="" loading="lazy" className={cn("h-full w-full object-cover", className)} />
  );
}
