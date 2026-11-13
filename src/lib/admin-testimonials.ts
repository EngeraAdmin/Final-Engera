import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getCloudflareEnv } from "@/lib/cf-env";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureSchema } from "@/lib/db-schema";
import { testimonials as builtinTestimonials } from "@/data/testimonials";
import { tokenFor } from "@/lib/media-library";

export interface AlbumPhoto {
  src: string;
  alt: string;
}

export interface AdminTestimonial {
  id: number;
  quote: string;
  name: string;
  title: string;
  facility_slug: string;
  /** Stored photo, or the built-in one (as a builtin: token). */
  photo: string;
  photos: AlbumPhoto[];
  source: string;
  show_on_impact: boolean;
  sort_order: number;
  updated_at: string | null;
}

interface Row {
  id: number;
  legacy_id: string | null;
  quote: string;
  name: string;
  title: string | null;
  facility_slug: string | null;
  photo_url: string | null;
  photos_json: string | null;
  source: string | null;
  show_on_impact: number | null;
  sort_order: number;
  updated_at: string | null;
}

const builtinFor = (legacyId: string | null) =>
  legacyId ? builtinTestimonials.find((t) => t.id === legacyId) : undefined;

function parseAlbum(json: string | null): AlbumPhoto[] | undefined {
  if (!json) return undefined;
  try {
    const v = JSON.parse(json) as AlbumPhoto[];
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

function toAdmin(row: Row): AdminTestimonial {
  const base = builtinFor(row.legacy_id);
  return {
    id: row.id,
    quote: row.quote,
    name: row.name,
    title: row.title ?? "",
    facility_slug: row.facility_slug ?? "",
    photo: row.photo_url ?? tokenFor(base?.photo),
    photos:
      parseAlbum(row.photos_json) ??
      base?.photos?.map((p) => ({ src: tokenFor(p.src), alt: p.alt })) ??
      [],
    source: row.source ?? base?.source ?? "",
    show_on_impact:
      row.show_on_impact === null ? base?.showOnImpact !== false : row.show_on_impact !== 0,
    sort_order: row.sort_order,
    updated_at: row.updated_at,
  };
}

export const listTestimonialsServerFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const { DB } = getCloudflareEnv();
  await ensureSchema(DB);
  const { results } = await DB.prepare(
    `SELECT id, legacy_id, quote, name, title, facility_slug, photo_url, photos_json, source,
            show_on_impact, sort_order, updated_at
     FROM testimonials ORDER BY sort_order ASC, id ASC`,
  ).all<Row>();
  return results.map(toAdmin);
});

const testimonialInput = z.object({
  id: z.number().optional(),
  quote: z.string().trim().min(1, "Required"),
  name: z.string().trim().min(1, "Required"),
  title: z.string().trim().optional(),
  facility_slug: z.string().trim().optional(),
  photo: z.string().trim().optional(),
  photos: z.array(z.object({ src: z.string(), alt: z.string() })).optional(),
  source: z.string().trim().optional(),
  show_on_impact: z.boolean().optional(),
});

export const saveTestimonialServerFn = createServerFn({ method: "POST" })
  .validator(testimonialInput)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);

    let base: ReturnType<typeof builtinFor>;
    if (data.id) {
      const row = await DB.prepare("SELECT legacy_id FROM testimonials WHERE id = ?")
        .bind(data.id)
        .first<{ legacy_id: string | null }>();
      base = builtinFor(row?.legacy_id ?? null);
    }

    const photos = (data.photos ?? []).filter((p) => p.src.trim());
    const baseAlbum = base?.photos?.map((p) => ({ src: tokenFor(p.src), alt: p.alt })) ?? [];
    const photosJson =
      JSON.stringify(photos) === JSON.stringify(baseAlbum) ? null : JSON.stringify(photos);
    const photo = !data.photo
      ? base?.photo
        ? ""
        : null
      : base && data.photo === tokenFor(base.photo)
        ? null
        : data.photo;
    const values = [
      data.quote,
      data.name,
      data.title || null,
      data.facility_slug || null,
      photo,
      photosJson,
      data.source || null,
      data.show_on_impact === false ? 0 : 1,
    ];

    if (data.id) {
      await DB.prepare(
        `UPDATE testimonials
         SET quote = ?, name = ?, title = ?, facility_slug = ?, photo_url = ?, photos_json = ?,
             source = ?, show_on_impact = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(...values, data.id)
        .run();
      return { ok: true as const, id: data.id };
    }

    const result = await DB.prepare(
      `INSERT INTO testimonials (quote, name, title, facility_slug, photo_url, photos_json, source, show_on_impact, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM testimonials))`,
    )
      .bind(...values)
      .run();
    return { ok: true as const, id: result.meta.last_row_id };
  });

export const deleteTestimonialServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await DB.prepare("DELETE FROM testimonials WHERE id = ?").bind(data.id).run();
    return { ok: true as const };
  });

export const reorderTestimonialsServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(z.number()) }))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);
    if (data.ids.length === 0) return { ok: true as const };
    await DB.batch(
      data.ids.map((id, i) =>
        DB.prepare(
          "UPDATE testimonials SET sort_order = ?, updated_at = datetime('now') WHERE id = ?",
        ).bind(i + 1, id),
      ),
    );
    return { ok: true as const };
  });
