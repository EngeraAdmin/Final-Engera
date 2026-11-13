import { contentOf } from "@/lib/content-schema";

/** Title/description meta tags for a page, from its editable "Search & sharing" section. */
export function pageHead(
  page: string,
  raw: Record<string, string> | undefined,
  canonical?: string,
) {
  const c = contentOf(page, raw);
  const title = c.t("seo_title");
  const meta: Record<string, string>[] = [
    { title },
    { name: "description", content: c.t("seo_description") },
    { property: "og:title", content: title },
    { property: "og:description", content: c.t("seo_og_description") },
  ];
  if (canonical) meta.push({ property: "og:url", content: canonical });
  return {
    meta,
    ...(canonical ? { links: [{ rel: "canonical", href: canonical }] } : {}),
  };
}
