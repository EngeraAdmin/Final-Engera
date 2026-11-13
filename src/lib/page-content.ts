import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getCloudflareEnv } from "@/lib/cf-env";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureSchema } from "@/lib/db-schema";
import {
  PAGES,
  defaultsFor,
  fieldFor,
  isPageKey,
  serializeDefault,
  validKeys,
} from "@/lib/content-schema";

interface ContentRow {
  page: string;
  field_key: string;
  field_value: string | null;
}

async function readOverrides(page: string): Promise<Record<string, string>> {
  const { DB } = getCloudflareEnv();
  await ensureSchema(DB);
  const { results } = await DB.prepare(
    "SELECT page, field_key, field_value FROM page_content WHERE page = ?",
  )
    .bind(page)
    .all<ContentRow>();
  const overrides = Object.fromEntries(
    results
      .filter((r) => r.field_value !== null)
      .map((r) => [r.field_key, r.field_value as string]),
  );

  // The footer text used to live in Settings — keep honouring an old value there.
  if (page === "global" && overrides["footer_blurb"] === undefined) {
    const old = await DB.prepare("SELECT value FROM settings WHERE key = 'footer_blurb'").first<{
      value: string | null;
    }>();
    if (old?.value?.trim()) overrides["footer_blurb"] = old.value;
  }
  return overrides;
}

/**
 * Used by the PUBLIC pages — must NEVER break page rendering. If the database
 * isn't reachable (not set up yet, a blip…) it quietly returns the built-in
 * defaults, so the pages look exactly as they always have.
 */
export const getPublicPageContentServerFn = createServerFn({ method: "GET" })
  .validator(z.object({ page: z.string() }))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    if (!isPageKey(data.page)) return {};
    const defaults = defaultsFor(data.page);
    try {
      return { ...defaults, ...(await readOverrides(data.page)) };
    } catch {
      return defaults;
    }
  });

/** Admin only: every page's saved changes (not the defaults) in one go. */
export const getAllPageContentServerFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const { DB } = getCloudflareEnv();
  await ensureSchema(DB);
  const overrides: Record<string, Record<string, string>> = {};
  for (const p of PAGES) overrides[p.key] = await readOverrides(p.key);
  return { overrides };
});

export const savePageContentServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      page: z.string(),
      // null = "back to the default" (the row is deleted)
      fields: z.record(z.string(), z.string().nullable()),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminSession();
    if (!isPageKey(data.page)) return { ok: false as const, error: "Unknown page." };

    const allowed = validKeys(data.page);
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);

    const statements: D1PreparedStatement[] = [];
    for (const [key, rawValue] of Object.entries(data.fields)) {
      if (!allowed.has(key)) continue;
      const field = fieldFor(data.page, key);
      const isDefault =
        rawValue === null ||
        (field ? rawValue === serializeDefault(field) : rawValue === "false" || rawValue === "");
      if (isDefault) {
        statements.push(
          DB.prepare("DELETE FROM page_content WHERE page = ? AND field_key = ?").bind(
            data.page,
            key,
          ),
        );
      } else {
        statements.push(
          DB.prepare(
            `INSERT INTO page_content (page, field_key, field_value, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(page, field_key) DO UPDATE SET field_value = excluded.field_value, updated_at = datetime('now')`,
          ).bind(data.page, key, rawValue),
        );
      }
    }
    // The footer text has moved out of Settings; clear the old copy once it's edited here.
    if (data.page === "global" && "footer_blurb" in data.fields) {
      statements.push(DB.prepare("DELETE FROM settings WHERE key = 'footer_blurb'"));
    }

    if (statements.length > 0) await DB.batch(statements);
    return { ok: true as const, saved: statements.length };
  });
