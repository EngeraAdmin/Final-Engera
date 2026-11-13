import { createServerFn } from "@tanstack/react-start";

import { getCloudflareEnv } from "@/lib/cf-env";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureSchema } from "@/lib/db-schema";

export interface Activity {
  kind: "page" | "facility" | "testimonial" | "setting";
  ref: string;
  detail: string;
  updated_at: string;
}

export const getDashboardServerFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const { DB } = getCloudflareEnv();
  await ensureSchema(DB);
  const [facilities, testimonials, media, edits, recent] = await DB.batch([
    DB.prepare("SELECT COUNT(*) AS n FROM facilities WHERE hidden = 0"),
    DB.prepare("SELECT COUNT(*) AS n FROM testimonials"),
    DB.prepare("SELECT COUNT(*) AS n FROM media"),
    DB.prepare("SELECT COUNT(*) AS n FROM page_content"),
    DB.prepare(
      `SELECT kind, ref, detail, updated_at FROM (
         SELECT 'page' AS kind, page AS ref, field_key AS detail, updated_at FROM page_content
         UNION ALL SELECT 'facility', name, slug, updated_at FROM facilities
         UNION ALL SELECT 'testimonial', name, '', updated_at FROM testimonials
         UNION ALL SELECT 'setting', key, '', updated_at FROM settings
       ) ORDER BY updated_at DESC LIMIT 8`,
    ),
  ]);
  const n = (r: D1Result | undefined) =>
    Number((r?.results?.[0] as { n?: number } | undefined)?.n ?? 0);
  return {
    counts: {
      facilities: n(facilities),
      testimonials: n(testimonials),
      media: n(media),
      edits: n(edits),
    },
    recent: (recent?.results ?? []) as unknown as Activity[],
  };
});
