import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { MediaThumb, uploadFile } from "@/components/admin/MediaPicker";
import { Badge, Btn, EmptyState, formatBytes, formatWhen } from "@/components/admin/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  deleteMediaServerFn,
  listMediaServerFn,
  UPLOAD_HELP,
  type MediaItem,
  type MediaKind,
} from "@/lib/admin-media";
import { builtinImages } from "@/lib/media-library";

export const Route = createFileRoute("/admin/media")({
  beforeLoad: async () => {
    const session = await requireAdminSession();
    return { session };
  },
  loader: async () => listMediaServerFn(),
  component: MediaPage,
});

type Filter = "all" | MediaKind | "builtin";

function MediaPage() {
  const router = useRouter();
  const items = Route.useLoaderData();
  const [filter, setFilter] = useState<Filter>("all");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(
    () =>
      filter === "all" ? items : filter === "builtin" ? [] : items.filter((m) => m.kind === filter),
    [items, filter],
  );

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading({ done: 0, total: list.length });
    let failed = 0;
    for (const [i, file] of list.entries()) {
      try {
        await uploadFile(file);
      } catch (e) {
        failed++;
        toast.error(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    await router.invalidate();
    if (failed < list.length)
      toast.success(
        `${list.length - failed} file${list.length - failed === 1 ? "" : "s"} uploaded.`,
      );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMediaServerFn({ data: { id: deleteTarget.id } });
      setDeleteTarget(null);
      await router.invalidate();
      toast.success("File deleted.");
    } finally {
      setDeleting(false);
    }
  }

  function copyLink(url: string) {
    const absolute = new URL(url, window.location.origin).toString();
    void navigator.clipboard?.writeText(absolute);
    toast.success("Link copied.");
  }

  const counts = {
    all: items.length,
    image: items.filter((m) => m.kind === "image").length,
    video: items.filter((m) => m.kind === "video").length,
    file: items.filter((m) => m.kind === "file").length,
    builtin: builtinImages().filter((b) => b.folder !== "brand").length,
  };
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All uploads" },
    { id: "image", label: "Photos" },
    { id: "video", label: "Videos" },
    { id: "file", label: "PDFs" },
    { id: "builtin", label: "Built-in website photos" },
  ];

  return (
    <AdminShell
      title="Media library"
      breadcrumb="Photos, videos and documents you can use anywhere on the website"
      actions={
        <Btn variant="primary" onClick={() => inputRef.current?.click()} loading={!!uploading}>
          {!uploading && <UploadCloud className="size-4" />}
          {uploading ? `Uploading ${uploading.done}/${uploading.total}…` : "Upload files"}
        </Btn>
      }
    >
      <div
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
        className={cn(
          "mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragOver ? "border-[#116dff] bg-[#e7f0ff]" : "border-[#c9d6ea] bg-white",
        )}
      >
        {uploading ? (
          <Loader2 className="size-7 animate-spin text-[#116dff]" />
        ) : (
          <UploadCloud className="size-7 text-[#116dff]" />
        )}
        <p className="mt-2 text-sm font-medium text-[#1e2635]">
          Drag files here, or{" "}
          <button
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer text-[#116dff] hover:underline"
          >
            choose from your computer
          </button>
        </p>
        <p className="mt-1 text-xs text-[#7b879b]">{UPLOAD_HELP}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              filter === f.id
                ? "bg-[#1e2635] text-white"
                : "bg-white text-[#3b4658] ring-1 ring-[#e3e7ed] hover:ring-[#116dff]",
            )}
          >
            {f.label} <span className="opacity-60">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {filter === "builtin" ? (
        <>
          <p className="mb-4 text-[13px] text-[#69758a]">
            These photos come with the website. Pick them anywhere a photo can be changed; they
            can't be deleted.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {builtinImages()
              .filter((b) => b.folder !== "brand")
              .map((b) => (
                <div
                  key={b.token}
                  className="overflow-hidden rounded-lg border border-[#e3e7ed] bg-white"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={b.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <p className="truncate px-2.5 py-2 text-xs font-medium">{b.name}</p>
                </div>
              ))}
          </div>
        </>
      ) : shown.length === 0 ? (
        <EmptyState icon={<ImageIcon className="size-5" />} title="Nothing uploaded yet">
          Uploaded files show up here and in every photo picker on the website editor.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((m) => (
            <div
              key={m.id}
              className="group overflow-hidden rounded-lg border border-[#e3e7ed] bg-white"
            >
              <div className="admin-checker relative aspect-[4/3] overflow-hidden">
                <MediaThumb src={m.url} kind={m.kind} />
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-[#0f1a2e]/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => copyLink(m.url)}
                    className="cursor-pointer rounded-full bg-white p-2 text-[#1e2635] hover:text-[#116dff]"
                    title="Copy link"
                  >
                    <Copy className="size-4" />
                  </button>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-white p-2 text-[#1e2635] hover:text-[#116dff]"
                    title="Open"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                  <button
                    onClick={() => setDeleteTarget(m)}
                    className="cursor-pointer rounded-full bg-white p-2 text-[#1e2635] hover:text-[#e5484d]"
                    title="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-xs font-medium text-[#1e2635]" title={m.filename ?? ""}>
                  {m.filename || "Untitled"}
                </p>
                <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-[#9aa5b6]">
                  <span>
                    {formatBytes(m.size)} · {formatWhen(m.created_at)}
                  </span>
                  {m.uses > 0 ? <Badge tone="green">In use</Badge> : <Badge>Unused</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.filename ?? "this file"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.uses > 0
                ? `It's used in ${deleteTarget.uses} place${deleteTarget.uses === 1 ? "" : "s"} on the website — those spots will show nothing until you pick another file. `
                : "It isn't used anywhere on the website. "}
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-[#e5484d] hover:bg-[#cf3a3f]"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
