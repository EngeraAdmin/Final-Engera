import { createServerFn } from "@tanstack/react-start";

import { facilities as builtinFacilities, MAP_CENTER, type Facility } from "@/data/facilities";
import { testimonials as builtinTestimonials, type Testimonial } from "@/data/testimonials";
import { BUTTONDOWN_USERNAME, DONATE_URL, ORG, SOCIAL_LINKS } from "@/lib/site";
import { getCloudflareEnv } from "@/lib/cf-env";
import { ensureSchema } from "@/lib/db-schema";
import { defaultsFor } from "@/lib/content-schema";
import { mediaUrl } from "@/lib/media-library";

/**
 * What the public website shows for facilities, testimonials, site-wide
 * settings and the shared header/footer content. Rule of thumb: the admin
 * database wins once it has content (it is seeded with everything already on
 * the site), layered over the built-in data. If the database isn't connected
 * or errors, the built-in content is shown unchanged: the public site must
 * never break because of the admin.
 */

export interface SiteSettings {
  donateUrl: string;
  email: string;
  phone: string;
  address: string;
  footerBlurb: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  buttondownUsername: string;
}

export interface SiteData {
  facilities: Facility[];
  testimonials: Testimonial[];
  settings: SiteSettings;
  /** Raw "Header & footer" content — read it with contentOf("global", …). */
  global: Record<string, string>;
}

interface FacilityRow {
  slug: string;
  name: string;
  region: string | null;
  lat: number | null;
  lon: number | null;
  short_description: string | null;
  location_note: string | null;
  description: string | null;
  photo_url: string | null;
  photo_alt?: string | null;
  facts_json?: string | null;
  work_json?: string | null;
  hidden?: number | null;
}

interface TestimonialRow {
  id: number;
  legacy_id: string | null;
  quote: string;
  name: string;
  title: string | null;
  facility_slug: string | null;
  photo_url: string | null;
  source?: string | null;
  photos_json?: string | null;
  show_on_impact?: number | null;
}

const linkFor = (label: string) => SOCIAL_LINKS.find((l) => l.label === label)?.href ?? "";

export function defaultSettings(): SiteSettings {
  return {
    donateUrl: DONATE_URL,
    email: ORG.email,
    phone: "",
    address: "",
    footerBlurb: "",
    facebookUrl: linkFor("Facebook"),
    instagramUrl: linkFor("Instagram"),
    linkedinUrl: linkFor("LinkedIn"),
    buttondownUsername: BUTTONDOWN_USERNAME,
  };
}

function firstSentence(text: string | undefined): string {
  if (!text) return "";
  const match = text.match(/^.*?[.!?](\s|$)/);
  const sentence = (match ? match[0] : text).trim();
  return sentence.length > 160 ? `${sentence.slice(0, 157).trimEnd()}…` : sentence;
}

function parseJson<T>(value: string | null | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function mergeFacilities(rows: FacilityRow[]): Facility[] {
  if (rows.length === 0) return builtinFacilities;
  return rows
    .filter((row) => !row.hidden)
    .map((row): Facility => {
      const base = builtinFacilities.find((f) => f.slug === row.slug);
      const paragraphs = row.description?.trim()
        ? row.description
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean)
        : (base?.description ?? []);
      const uploadedPhoto = mediaUrl(row.photo_url) || undefined;
      // An empty (not NULL) photo means the admin removed it on purpose.
      const photo = row.photo_url === "" ? undefined : (uploadedPhoto ?? base?.photo);
      const region = row.region?.trim() || base?.region || "";
      const facts =
        parseJson<{ label: string; value: string }[]>(row.facts_json)?.filter(
          (f) => f.label?.trim() || f.value?.trim(),
        ) ??
        base?.facts ??
        [];
      const work = parseJson<string[]>(row.work_json)?.filter((w) => w?.trim()) ?? base?.work ?? [];
      const facility: Facility = {
        slug: row.slug,
        name: row.name,
        shortDescription:
          row.short_description?.trim() || base?.shortDescription || firstSentence(paragraphs[0]),
        description: paragraphs,
        region,
        locationNote: row.location_note?.trim() || base?.locationNote || region,
        coordinates: [
          row.lat ?? base?.coordinates[0] ?? MAP_CENTER[0],
          row.lon ?? base?.coordinates[1] ?? MAP_CENTER[1],
        ],
        facts,
        work,
      };
      if (photo) facility.photo = photo;
      // The built-in alt text describes the built-in photo (and names the facility): keep it,
      // but follow a rename. A freshly uploaded photo gets its own description, or the name.
      const photoAlt =
        row.photo_alt?.trim() ||
        (uploadedPhoto ? row.name : base?.photoAlt?.split(base.name).join(row.name));
      if (photoAlt) facility.photoAlt = photoAlt;
      if (base?.catchment !== undefined) facility.catchment = base.catchment;
      if (base?.opdPatients !== undefined) facility.opdPatients = base.opdPatients;
      return facility;
    });
}

export function mergeTestimonials(rows: TestimonialRow[]): Testimonial[] {
  if (rows.length === 0) return builtinTestimonials;
  return rows.map((row): Testimonial => {
    const base = row.legacy_id
      ? builtinTestimonials.find((t) => t.id === row.legacy_id)
      : undefined;
    const uploadedPhoto = mediaUrl(row.photo_url) || undefined;
    const photo = row.photo_url === "" ? undefined : (uploadedPhoto ?? base?.photo);
    const t: Testimonial = {
      id: row.legacy_id ?? `db-${row.id}`,
      quote: row.quote,
      name: row.name,
    };
    if (row.title?.trim()) t.title = row.title.trim();
    if (row.facility_slug?.trim()) t.facilitySlug = row.facility_slug.trim();
    if (photo) t.photo = photo;
    const photoAlt = uploadedPhoto ? row.name : base?.photoAlt;
    if (photoAlt) t.photoAlt = photoAlt;
    const album = parseJson<{ src: string; alt: string }[]>(row.photos_json);
    if (album) {
      const resolved = album
        .map((p) => ({ src: mediaUrl(p.src), alt: p.alt ?? "" }))
        .filter((p) => p.src);
      if (resolved.length > 0) t.photos = resolved;
    } else if (base?.photos) {
      t.photos = base.photos;
    }
    const source = row.source ?? base?.source;
    if (source?.trim()) t.source = source.trim();
    t.showOnImpact =
      row.show_on_impact === undefined || row.show_on_impact === null
        ? base?.showOnImpact !== false
        : row.show_on_impact !== 0;
    return t;
  });
}

const SETTING_KEYS: Record<string, keyof SiteSettings> = {
  donate_url: "donateUrl",
  contact_email: "email",
  contact_phone: "phone",
  contact_address: "address",
  footer_blurb: "footerBlurb",
  social_facebook: "facebookUrl",
  social_instagram: "instagramUrl",
  social_linkedin: "linkedinUrl",
  buttondown_username: "buttondownUsername",
};

export function mergeSettings(rows: { key: string; value: string | null }[]): SiteSettings {
  const settings = defaultSettings();
  for (const row of rows) {
    const field = SETTING_KEYS[row.key];
    const value = row.value?.trim();
    // A blank admin field means "use the default", never "show nothing".
    // "-" switches an optional item (e.g. a social icon) off altogether.
    if (field && value) settings[field] = value === "-" ? "" : value;
  }
  return settings;
}

export function socialLinksFor(settings: SiteSettings): { label: string; href: string }[] {
  return [
    { label: "LinkedIn", href: settings.linkedinUrl },
    { label: "Instagram", href: settings.instagramUrl },
    { label: "Facebook", href: settings.facebookUrl },
  ].filter((l) => l.href);
}

function builtinSiteData(): SiteData {
  return {
    facilities: builtinFacilities,
    testimonials: builtinTestimonials,
    settings: defaultSettings(),
    global: defaultsFor("global"),
  };
}

export const getSiteDataServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteData> => {
    try {
      const { DB } = getCloudflareEnv();
      await ensureSchema(DB);
      const [facilityResult, testimonialResult, settingsResult, globalResult] = await DB.batch([
        DB.prepare(
          "SELECT slug, name, region, lat, lon, short_description, location_note, description, photo_url, photo_alt, facts_json, work_json, hidden FROM facilities ORDER BY sort_order ASC, name ASC",
        ),
        DB.prepare(
          "SELECT id, legacy_id, quote, name, title, facility_slug, photo_url, source, photos_json, show_on_impact FROM testimonials ORDER BY sort_order ASC, id ASC",
        ),
        DB.prepare("SELECT key, value FROM settings"),
        DB.prepare("SELECT field_key, field_value FROM page_content WHERE page = 'global'"),
      ]);
      const settings = mergeSettings(
        (settingsResult?.results ?? []) as unknown as { key: string; value: string | null }[],
      );
      const global: Record<string, string> = defaultsFor("global");
      if (settings.footerBlurb) global["footer_blurb"] = settings.footerBlurb;
      for (const row of (globalResult?.results ?? []) as unknown as {
        field_key: string;
        field_value: string | null;
      }[]) {
        if (row.field_value !== null) global[row.field_key] = row.field_value;
      }
      return {
        facilities: mergeFacilities((facilityResult?.results ?? []) as unknown as FacilityRow[]),
        testimonials: mergeTestimonials(
          (testimonialResult?.results ?? []) as unknown as TestimonialRow[],
        ),
        settings,
        global,
      };
    } catch {
      // Database not connected yet, or a transient error — show the built-in content.
      return builtinSiteData();
    }
  },
);
