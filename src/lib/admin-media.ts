import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getCloudflareEnv } from "@/lib/cf-env";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureSchema } from "@/lib/db-schema";

const MB = 1024 * 1024;

export type MediaKind = "image" | "video" | "file";

const RULES: { kind: MediaKind; types: string[]; maxBytes: number; label: string }[] = [
  {
    kind: "image",
    // No SVG: an SVG file can contain scripts.
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxBytes: 8 * MB,
    label: "Photos (JPEG, PNG, WebP, GIF) up to 8 MB",
  },
  {
    kind: "video",
    types: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 60 * MB,
    label: "Videos (MP4, WebM, MOV) up to 60 MB",
  },
  {
    kind: "file",
    types: ["application/pdf"],
    maxBytes: 25 * MB,
    label: "PDF documents up to 25 MB",
  },
];

export const UPLOAD_HELP = RULES.map((r) => r.label).join(" · ");

export function kindOf(contentType: string | null | undefined): MediaKind {
  const t = contentType ?? "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  return "file";
}

export interface MediaItem {
  id: number;
  url: string;
  filename: string | null;
  content_type: string | null;
  size: number | null;
  created_at: string;
  kind: MediaKind;
  /** How many places on the website use it. */
  uses: number;
}

/**
 * Uploads a photo, video or PDF to the R2 bucket and returns its public URL.
 * Requires the bucket's public address (r2.dev or a custom domain) to be set
 * as R2_PUBLIC_BASE_URL in wrangler.toml — see README-ADMIN-SETUP.md.
 */
export const uploadMediaServerFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected form data");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    return file;
  })
  .handler(async ({ data: file }) => {
    await requireAdminSession();

    const rule = RULES.find((r) => r.types.includes(file.type));
    if (!rule) {
      return {
        ok: false as const,
        error: "That file type isn't supported. Upload a photo, an MP4 video or a PDF.",
      };
    }
    if (file.size > rule.maxBytes) {
      return {
        ok: false as const,
        error: `That file is too large — ${rule.kind === "image" ? "photos" : rule.kind === "video" ? "videos" : "PDFs"} must be under ${Math.round(rule.maxBytes / MB)} MB.`,
      };
    }

    const { DB, MEDIA, R2_PUBLIC_BASE_URL } = getCloudflareEnv();
    await ensureSchema(DB);
    const ext =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "bin";
    const key = `uploads/${crypto.randomUUID()}.${ext}`;

    await MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    const base = R2_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${base}/${key}`;
    const result = await DB.prepare(
      "INSERT INTO media (storage_key, url, filename, content_type, size) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(key, url, file.name.slice(0, 200), file.type, file.size)
      .run();

    return { ok: true as const, url, id: result.meta.last_row_id, kind: rule.kind };
  });

async function usageHaystack(DB: D1Database): Promise<string> {
  const [pages, facilities, testimonials] = await DB.batch([
    DB.prepare("SELECT field_value AS v FROM page_content"),
    DB.prepare("SELECT photo_url AS v FROM facilities"),
    DB.prepare(
      "SELECT COALESCE(photo_url, '') || ' ' || COALESCE(photos_json, '') AS v FROM testimonials",
    ),
  ]);
  return [pages, facilities, testimonials]
    .flatMap((r) => (r?.results ?? []) as { v: string | null }[])
    .map((r) => r.v ?? "")
    .join("\n");
}

export const listMediaServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MediaItem[]> => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);
    const { results } = await DB.prepare(
      "SELECT id, url, filename, content_type, size, created_at FROM media ORDER BY id DESC",
    ).all<Omit<MediaItem, "kind" | "uses">>();
    const haystack = await usageHaystack(DB);
    return results.map((r) => ({
      ...r,
      kind: kindOf(r.content_type),
      uses: haystack.split(r.url).length - 1,
    }));
  },
);

export const deleteMediaServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB, MEDIA } = getCloudflareEnv();
    await ensureSchema(DB);
    const row = await DB.prepare("SELECT storage_key FROM media WHERE id = ?")
      .bind(data.id)
      .first<{ storage_key: string }>();
    if (!row) return { ok: true as const };
    try {
      await MEDIA.delete(row.storage_key);
    } catch {
      // Already gone from storage — still remove it from the library.
    }
    await DB.prepare("DELETE FROM media WHERE id = ?").bind(data.id).run();
    return { ok: true as const };
  });
