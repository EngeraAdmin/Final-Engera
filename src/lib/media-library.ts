/**
 * Built-in photos (the ones bundled with the website) and helpers for turning
 * a stored image value into a real URL.
 *
 * The admin stores built-in photos as stable tokens like
 * "builtin:photos/hero.jpg" instead of the hashed build URL
 * (/assets/hero-3f9a1c.jpg), so a saved choice keeps working after every
 * rebuild. Uploaded photos are stored as their full public URL.
 */

const modules = import.meta.glob<string>("/src/assets/{photos,team,brand}/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

export interface BuiltinImage {
  token: string;
  url: string;
  name: string;
  folder: string;
}

const BUILTIN: BuiltinImage[] = Object.entries(modules)
  .map(([path, url]) => {
    const rel = path.replace(/^\/src\/assets\//, "");
    const [folder = "", file = ""] = rel.split("/");
    return {
      token: `builtin:${rel}`,
      url,
      folder,
      name: file
        .replace(/\.[a-z]+$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (ch) => ch.toUpperCase()),
    };
  })
  .sort((a, b) => a.token.localeCompare(b.token));

const BY_TOKEN = new Map(BUILTIN.map((img) => [img.token, img.url]));
const BY_URL = new Map(BUILTIN.map((img) => [img.url, img.token]));

export function builtinImages(): BuiltinImage[] {
  return BUILTIN;
}

/** Stored value → URL the browser can load. Empty/unknown values give "". */
export function mediaUrl(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.startsWith("builtin:")) return BY_TOKEN.get(v) ?? "";
  return v;
}

/** URL of a bundled asset → its stable token (used to build defaults from existing data files). */
export function tokenFor(url: string | undefined): string {
  if (!url) return "";
  return BY_URL.get(url) ?? url;
}

export function isBuiltin(value: string | null | undefined): boolean {
  return (value ?? "").startsWith("builtin:");
}
