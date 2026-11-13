import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getCloudflareEnv } from "@/lib/cf-env";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureSchema } from "@/lib/db-schema";
import { defaultSettings } from "@/lib/site-data";

export interface SettingField {
  key: string;
  label: string;
  help?: string;
  placeholder?: string;
  type?: "url" | "email" | "text" | "textarea";
  /** Can be switched off (stored as HIDE_VALUE). */
  hideable?: boolean;
}

export interface SettingGroup {
  id: string;
  title: string;
  description: string;
  fields: SettingField[];
}

const d = defaultSettings();

/** Site-wide settings, grouped the way the Settings screen shows them. */
export const SETTINGS_GROUPS: SettingGroup[] = [
  {
    id: "donations",
    title: "Donations",
    description: "Where every “Donate” button on the website goes.",
    fields: [
      {
        key: "donate_url",
        label: "Donate button link",
        type: "url",
        placeholder: d.donateUrl,
        help: "Your Beacon donation form (or any other donation page).",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact details",
    description:
      "Shown on the Contact page and in the footer. The contact form sends to this email.",
    fields: [
      { key: "contact_email", label: "Email", type: "email", placeholder: d.email },
      { key: "contact_phone", label: "Phone", type: "text", placeholder: "Optional" },
      { key: "contact_address", label: "Address", type: "textarea", placeholder: "Optional" },
    ],
  },
  {
    id: "social",
    title: "Social media",
    description:
      "The icons in the footer. Leave a link empty to keep the current one; switch an icon off to hide it.",
    fields: [
      {
        key: "social_facebook",
        label: "Facebook",
        type: "url",
        placeholder: d.facebookUrl,
        hideable: true,
      },
      {
        key: "social_instagram",
        label: "Instagram",
        type: "url",
        placeholder: d.instagramUrl,
        hideable: true,
      },
      {
        key: "social_linkedin",
        label: "LinkedIn",
        type: "url",
        placeholder: d.linkedinUrl,
        hideable: true,
      },
    ],
  },
  {
    id: "newsletter",
    title: "Newsletter (Buttondown)",
    description:
      "Connects the website's newsletter forms to Buttondown. Until a username is set, the forms only show a thank-you message and store nothing.",
    fields: [
      {
        key: "buttondown_username",
        label: "Buttondown username",
        type: "text",
        placeholder: "e.g. engera",
        help: "The last part of your newsletter's address: buttondown.com/engera → engera",
      },
    ],
  },
];

export const SETTINGS_FIELDS = SETTINGS_GROUPS.flatMap((g) => g.fields);

/** Social links count as "set" when blank (blank = built-in default), so this hides one. */
export const HIDE_VALUE = "-";

export const getSettingsServerFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdminSession();
  const { DB } = getCloudflareEnv();
  await ensureSchema(DB);
  const { results } = await DB.prepare("SELECT key, value FROM settings").all<{
    key: string;
    value: string | null;
  }>();
  const map = Object.fromEntries(results.map((r) => [r.key, r.value ?? ""]));
  return Object.fromEntries(SETTINGS_FIELDS.map((f) => [f.key, map[f.key] ?? ""])) as Record<
    string,
    string
  >;
});

const settingsInput = z.object(
  Object.fromEntries(SETTINGS_FIELDS.map((f) => [f.key, z.string().trim().optional()])),
);

export const saveSettingsServerFn = createServerFn({ method: "POST" })
  .validator(settingsInput)
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);
    const values = data as Record<string, string | undefined>;
    const statements = SETTINGS_FIELDS.map((f) =>
      DB.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      ).bind(f.key, values[f.key] ?? ""),
    );
    await DB.batch(statements);
    return { ok: true as const };
  });
