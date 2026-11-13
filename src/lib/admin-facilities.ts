import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getCloudflareEnv } from "@/lib/cf-env";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureSchema } from "@/lib/db-schema";
import { facilities as builtinFacilities } from "@/data/facilities";
import { tokenFor } from "@/lib/media-library";

export interface FacilityFact {
  label: string;
  value: string;
}

export interface AdminFacility {
  id: number;
  slug: string;
  name: string;
  region: string;
  lat: number | null;
  lon: number | null;
  short_description: string;
  location_note: string;
  description: string;
  /** Stored photo, or the built-in one (as a builtin: token). */
  photo: string;
  photo_alt: string;
  facts: FacilityFact[];
  work: string[];
  hidden: boolean;
  sort_order: number;
  updated_at: string | null;
}

interface Row {
  id: number;
  slug: string;
  name: string;
  region: string | null;
  lat: number | null;
  lon: number | null;
  short_description: string | null;
  location_note: string | null;
  description: string | null;
  photo_url: string | null;
  photo_alt: string | null;
  facts_json: string | null;
  work_json: string | null;
  hidden: number | null;
  sort_order: number;
  updated_at: string | null;
}

function parse<T>(json: string | null): T | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

const builtinFor = (slug: string) => builtinFacilities.find((f) => f.slug === slug);

/** Shows the admin exactly what the website shows: stored values, else the built-in ones. */
function toAdmin(row: Row): AdminFacility {
  const base = builtinFor(row.slug);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region ?? base?.region ?? "",
    lat: row.lat,
    lon: row.lon,
    short_description: row.short_description ?? base?.shortDescription ?? "",
    location_note: row.location_note ?? base?.locationNote ?? "",
    description: row.description ?? base?.description.join("\n\n") ?? "",
    photo: row.photo_url ?? tokenFor(base?.photo),
    photo_alt: row.photo_alt ?? "",
    facts: parse<FacilityFact[]>(row.facts_json) ?? base?.facts ?? [],
    work: parse<string[]>(row.work_json) ?? base?.work ?? [],
    hidden: !!row.hidden,
    sort_order: row.sort_order,
    updated_at: row.updated_at,
  };
}

export const listFacilitiesServerFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const { DB } = getCloudflareEnv();
  await ensureSchema(DB);
  const { results } = await DB.prepare(
    `SELECT id, slug, name, region, lat, lon, short_description, location_note, description,
            photo_url, photo_alt, facts_json, work_json, hidden, sort_order, updated_at
     FROM facilities ORDER BY sort_order ASC, name ASC`,
  ).all<Row>();
  return results.map(toAdmin);
});

const facilityInput = z.object({
  id: z.number().optional(), // omitted = create, present = update
  slug: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1, "Required"),
  region: z.string().trim().optional(),
  // Required: a facility without a location can't be placed on the map.
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  short_description: z.string().trim().optional(),
  location_note: z.string().trim().optional(),
  description: z.string().trim().optional(),
  photo: z.string().trim().optional(),
  photo_alt: z.string().trim().optional(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  work: z.array(z.string()).optional(),
  hidden: z.boolean().optional(),
});

export const saveFacilityServerFn = createServerFn({ method: "POST" })
  .validator(facilityInput)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);

    // Slug must be unique (excluding this row, if updating).
    const existing = await DB.prepare("SELECT id FROM facilities WHERE slug = ?")
      .bind(data.slug)
      .first<{ id: number }>();
    if (existing && existing.id !== data.id) {
      return { ok: false as const, error: "That web address is already used by another facility." };
    }

    // Values identical to the built-in data are stored as NULL, so they keep following it.
    const base = builtinFor(data.slug);
    const facts = (data.facts ?? []).filter((f) => f.label.trim() || f.value.trim());
    const work = (data.work ?? []).map((w) => w.trim()).filter(Boolean);
    const factsJson =
      base && JSON.stringify(facts) === JSON.stringify(base.facts) ? null : JSON.stringify(facts);
    const workJson =
      base && JSON.stringify(work) === JSON.stringify(base.work) ? null : JSON.stringify(work);
    // "" = deliberately no photo (so a built-in one doesn't come back); null = follow the built-in one.
    const photo = !data.photo
      ? base?.photo
        ? ""
        : null
      : base && data.photo === tokenFor(base.photo)
        ? null
        : data.photo;
    const values = [
      data.slug,
      data.name,
      data.region || null,
      data.lat,
      data.lon,
      data.short_description || null,
      data.location_note || null,
      data.description || null,
      photo,
      data.photo_alt || null,
      factsJson,
      workJson,
      data.hidden ? 1 : 0,
    ];

    if (data.id) {
      await DB.prepare(
        `UPDATE facilities
         SET slug = ?, name = ?, region = ?, lat = ?, lon = ?, short_description = ?, location_note = ?,
             description = ?, photo_url = ?, photo_alt = ?, facts_json = ?, work_json = ?, hidden = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(...values, data.id)
        .run();
      return { ok: true as const, id: data.id };
    }

    const result = await DB.prepare(
      `INSERT INTO facilities (slug, name, region, lat, lon, short_description, location_note, description,
                               photo_url, photo_alt, facts_json, work_json, hidden, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM facilities))`,
    )
      .bind(...values)
      .run();
    return { ok: true as const, id: result.meta.last_row_id };
  });

export const deleteFacilityServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);
    const row = await DB.prepare("SELECT slug FROM facilities WHERE id = ?")
      .bind(data.id)
      .first<{ slug: string }>();
    const statements = [DB.prepare("DELETE FROM facilities WHERE id = ?").bind(data.id)];
    // Quotes linked to it stay, just no longer linked.
    if (row) {
      statements.unshift(
        DB.prepare("UPDATE testimonials SET facility_slug = NULL WHERE facility_slug = ?").bind(
          row.slug,
        ),
      );
    }
    await DB.batch(statements);
    return { ok: true as const };
  });

export const reorderFacilitiesServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(z.number()) }))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);
    if (data.ids.length === 0) return { ok: true as const };
    await DB.batch(
      data.ids.map((id, i) =>
        DB.prepare(
          "UPDATE facilities SET sort_order = ?, updated_at = datetime('now') WHERE id = ?",
        ).bind(i + 1, id),
      ),
    );
    return { ok: true as const };
  });
