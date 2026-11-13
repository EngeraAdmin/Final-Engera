/**
 * EVERY editable piece of the public website, page by page and section by
 * section — and, for each one, the text/photo/list the site shows today as its
 * default. Until someone edits something in the admin, the website renders
 * exactly these defaults, so this file changes nothing visually on its own.
 *
 * How values are stored: one row in the `page_content` table per edited field
 * (page, field_key, field_value). Lists are stored as JSON. Rows that equal the
 * default are deleted, so improving a default here later still reaches pages
 * nobody customised.
 *
 * To make something new editable: add a field below, then read it in the
 * page component with `c.t("key")`, `c.img("key")`, `c.list("key")` etc.
 */
import { teamGroups } from "@/data/team";
import { ORG, DONATE_URL } from "@/lib/site";
import { mediaUrl, tokenFor } from "@/lib/media-library";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScalarType =
  | "text"
  | "textarea"
  | "image"
  | "video"
  | "file"
  | "url"
  | "number"
  | "toggle"
  | "select"
  | "youtube";

export interface Option {
  value: string;
  label: string;
}

export interface ItemField {
  key: string;
  label: string;
  type: ScalarType | "lines";
  help?: string;
  placeholder?: string;
  rows?: number;
  options?: Option[];
  /** For selects whose options come from another list field on the same page. */
  optionsFrom?: { list: string; value: string; label: string };
  /** Lay out two of these side by side. */
  half?: boolean;
}

export interface ScalarField {
  key: string;
  label: string;
  type: ScalarType;
  default: string;
  help?: string;
  placeholder?: string;
  rows?: number;
  options?: Option[];
  half?: boolean;
}

export type ListItem = Record<string, unknown>;

export interface ListField {
  key: string;
  label: string;
  type: "list";
  default: ListItem[];
  fields: ItemField[];
  /** What one entry is called, e.g. "service" → "Add service". */
  itemLabel: string;
  /** Item field shown as the entry's title in the collapsed list. */
  titleKey: string;
  /** Optional image field shown as the entry's thumbnail. */
  thumbKey?: string;
  help?: string;
}

export type Field = ScalarField | ListField;

export interface Section {
  id: string;
  label: string;
  description?: string;
  /** Can be switched off from the editor (hidden on the live site). */
  hideable?: boolean;
  /** Not a visible block on the page (e.g. SEO). */
  virtual?: boolean;
  /** A shortcut to where related content is edited. */
  link?: { label: string; page?: string; section?: string; route?: string };
  fields: Field[];
}

export interface PageSchema {
  key: string;
  label: string;
  /** Where to preview it. */
  path: string;
  description: string;
  sections: Section[];
}

// ---------------------------------------------------------------------------
// Little builders, to keep the schema readable
// ---------------------------------------------------------------------------

const text = (
  key: string,
  label: string,
  def: string,
  extra: Partial<ScalarField> = {},
): ScalarField => ({
  key,
  label,
  type: "text",
  default: def,
  ...extra,
});
const area = (
  key: string,
  label: string,
  def: string,
  extra: Partial<ScalarField> = {},
): ScalarField => ({
  key,
  label,
  type: "textarea",
  default: def,
  ...extra,
});
const image = (
  key: string,
  label: string,
  def: string,
  extra: Partial<ScalarField> = {},
): ScalarField => ({
  key,
  label,
  type: "image",
  default: def,
  ...extra,
});
const video = (
  key: string,
  label: string,
  def: string,
  extra: Partial<ScalarField> = {},
): ScalarField => ({
  key,
  label,
  type: "video",
  default: def,
  ...extra,
});
const url = (
  key: string,
  label: string,
  def: string,
  extra: Partial<ScalarField> = {},
): ScalarField => ({
  key,
  label,
  type: "url",
  default: def,
  ...extra,
});

const PARAGRAPH_HELP = "Leave an empty line between paragraphs.";
const LINK_HELP =
  "A web address, an email link (mailto:…), or a page on this site (/contact). Use {donate} for the donate link and {email} for the contact email from Settings.";

function seo(title: string, description: string, ogDescription?: string): Section {
  return {
    id: "seo",
    label: "Search & sharing (SEO)",
    description: "What Google and social media previews show for this page.",
    virtual: true,
    fields: [
      text("seo_title", "Page title (browser tab & Google)", title),
      area("seo_description", "Search description", description, { rows: 3 }),
      area("seo_og_description", "Social share description", ogDescription ?? description, {
        rows: 3,
        help: "Shown when the page is shared on Facebook, LinkedIn, WhatsApp…",
      }),
    ],
  };
}

const statFields: ItemField[] = [
  { key: "value", label: "Number", type: "number", half: true },
  { key: "suffix", label: "After the number", type: "text", placeholder: "+", half: true },
  { key: "label", label: "Label", type: "text" },
  { key: "note", label: "Small print", type: "text" },
  {
    key: "plain",
    label: "Show without thousands separator (for years)",
    type: "toggle",
  },
];

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const HOME: PageSchema = {
  key: "home",
  label: "Home",
  path: "/",
  description: "The front page: hero, mission, figures, services, video and more.",
  sections: [
    {
      id: "hero",
      label: "Hero banner",
      description: "The big photo and headline at the top.",
      fields: [
        text("hero_eyebrow", "Small heading", "Gurage Zone & Oromia, Ethiopia"),
        text("hero_heading", "Headline", "Everyone has a right to access quality health care."),
        area(
          "hero_subtext",
          "Intro text",
          "Engera USA supports eight rural health facilities serving more than 230,000 people each year — with a focus on mothers, newborns and children.",
        ),
        image("hero_image", "Background photo", "builtin:photos/hero.jpg"),
        text(
          "hero_image_alt",
          "Photo description (for screen readers)",
          "A health worker caring for a mother and child at an Engera-supported health center",
        ),
        text("hero_primary_label", "Orange button text", "Donate now", { half: true }),
        text("hero_secondary_label", "Outline button text", "See the facilities", { half: true }),
      ],
    },
    {
      id: "mission",
      label: "Our mission",
      hideable: true,
      fields: [
        text("mission_eyebrow", "Small heading", "Our mission"),
        area(
          "mission_heading",
          "Heading",
          "Engera improves the health of women and children by partnering with local communities to promote well-being and prevent disease.",
        ),
        area(
          "mission_body",
          "Text",
          "We work alongside Ethiopian staff and religious sisters who run each facility, investing in the things that keep care running: medicines and diagnostics, maternity wards, tuberculosis units, water wells, solar power, and the training of nurses and midwives.",
          { rows: 5 },
        ),
        text("mission_link_label", "Link text", "Read our story →"),
        image("mission_image", "Photo", "builtin:photos/doctor-mother.jpg"),
        text(
          "mission_image_alt",
          "Photo description",
          "A doctor examining an expectant mother at a rural Ethiopian health center",
        ),
      ],
    },
    {
      id: "stats",
      label: "Key figures",
      description:
        "The numbers themselves are shared with the Impact page, so they're edited in one place.",
      link: { label: "Edit the numbers", page: "global", section: "figures" },
      hideable: true,
      fields: [
        text("stats_annual_eyebrow", "Second row heading", "Current annual reach (FY2025)"),
        area(
          "stats_footnote",
          "Footnote",
          "FY2025 figures from the Ethiopian Catholic Church Social and Development Commission plan and achievement data for the eight facilities we support. The all-time “people served” counter above is cumulative since Engera was founded.",
          { rows: 4 },
        ),
      ],
    },
    {
      id: "services",
      label: "What we do",
      hideable: true,
      fields: [
        text("services_eyebrow", "Small heading", "What we do"),
        text("services_heading", "Heading", "Four kinds of support, one goal"),
        {
          key: "services",
          label: "Cards",
          type: "list",
          itemLabel: "card",
          titleKey: "title",
          thumbKey: "photo",
          fields: [
            { key: "title", label: "Title", type: "text" },
            { key: "body", label: "Text", type: "textarea" },
            { key: "photo", label: "Photo 1", type: "image", half: true },
            { key: "photo2", label: "Photo 2 (optional — cross-fades)", type: "image", half: true },
            { key: "photo_alt", label: "Photo 1 description", type: "text" },
            { key: "photo2_alt", label: "Photo 2 description", type: "text" },
          ],
          default: [
            {
              title: "Healthcare",
              body: "Medicines, diagnostics, maternity wards and tuberculosis units — the essentials that let a rural health center actually treat people.",
              photo: "builtin:photos/healthcare-real.jpg",
              photo_alt: "A clinician examining a patient at an Engera-supported health center",
              photo2: "builtin:photos/hero.jpg",
              photo2_alt: "Patients waiting to be seen at a health center",
            },
            {
              title: "Education",
              body: "School meals, school facilities and the reusable sanitary pad programme that keeps girls in class.",
              photo: "builtin:photos/education-real.jpg",
              photo_alt: "Schoolchildren in a classroom supported by Engera",
              photo2: "builtin:photos/education-kids-real.jpg",
              photo2_alt: "Children at a school Engera supports",
            },
            {
              title: "Training",
              body: "Scholarships and clinical training for nurses, midwives and lab staff, so skills stay in the community.",
              photo: "builtin:photos/training.jpg",
              photo_alt: "Clinical staff training at an Engera-supported facility",
              photo2: "builtin:photos/staff.jpg",
              photo2_alt: "Engera staff and clinical team",
            },
            {
              title: "Infrastructure",
              body: "Solar power, water wells and buildings that keep care running through the night and through the dry season.",
              photo: "builtin:photos/solar-install-real.jpg",
              photo_alt: "A solar panel installation at an Engera-supported health center",
              photo2: "builtin:photos/clinic-visit.jpg",
              photo2_alt: "An Engera-supported health center building",
            },
          ],
        },
      ],
    },
    {
      id: "video",
      label: "YouTube video",
      hideable: true,
      fields: [
        {
          key: "video_youtube",
          label: "YouTube video",
          type: "youtube",
          default: "-kRT3nbQ2o0",
          help: "Paste the YouTube link (or just the video ID).",
        },
        text("video_title", "Video title (for screen readers)", "Engera USA"),
      ],
    },
    {
      id: "where",
      label: "Where we work",
      description: "Shows the first facilities from the Facilities list, in that order.",
      link: { label: "Manage facilities", route: "/admin/facilities" },
      hideable: true,
      fields: [
        text("where_eyebrow", "Small heading", "Where we work"),
        text("where_heading", "Heading", "Eight facilities, one network of care"),
        text("where_link_label", "Link text", "View map & all facilities →"),
        {
          key: "where_count",
          label: "How many facilities to show",
          type: "select",
          default: "3",
          options: ["3", "6", "9"].map((v) => ({ value: v, label: v })),
        },
      ],
    },
    {
      id: "help",
      label: "How you can help",
      hideable: true,
      fields: [
        text("help_eyebrow", "Small heading", "How you can help"),
        text("help_heading", "Heading", "There are three ways to make this work possible."),
        area(
          "help_body",
          "Text",
          "Whether you donate, use your skills on the ground, or partner with us as an organisation, your support helps provide care for mothers and children in rural Ethiopia.",
        ),
        text("help_donate_label", "Orange button", "Donate", { half: true }),
        text("help_volunteer_label", "Outline button", "Volunteer or partner", { half: true }),
      ],
    },
    {
      id: "newsletter",
      label: "Newsletter signup",
      hideable: true,
      fields: [
        text("news_eyebrow", "Small heading", "Newsletter"),
        text("news_heading", "Heading", "Stay close to the work"),
        area(
          "news_body",
          "Text",
          "A few updates a year from the health centres — new wards, solar installations, training and the people behind them.",
        ),
      ],
    },
    {
      id: "cta",
      label: "Donate banner",
      description: "The banner's text is shared by every page that shows it.",
      link: { label: "Edit the banner text", page: "global", section: "cta" },
      hideable: true,
      fields: [],
    },
    seo(
      "Engera USA — Health care for rural Ethiopia",
      "Engera USA supports eight rural health facilities in Ethiopia's Gurage Zone and Oromia's South West Shewa, serving more than 230,000 people a year.",
      "Eight health facilities. More than 230,000 people served each year. Maternal and child health care in rural Ethiopia.",
    ),
  ],
};

const teamGroupDefaults = teamGroups.map((g) => ({ id: g.id, label: g.label, heading: g.heading }));
const teamMemberDefaults = teamGroups.flatMap((g) =>
  g.members.map((m) => ({
    group: g.id,
    name: m.name,
    role: m.role,
    bio: m.bio,
    photo: tokenFor(m.photo),
  })),
);

const ABOUT: PageSchema = {
  key: "about",
  label: "About Us",
  path: "/about",
  description: "Story, vision & mission, history timeline and the team.",
  sections: [
    {
      id: "hero",
      label: "Opening",
      fields: [
        text("hero_eyebrow", "Small heading", "About us"),
        text("hero_heading", "Headline", "Working with — not for — the communities we serve."),
        area(
          "hero_subtext",
          "Intro text",
          "Officially founded in 2007, Engera marks twenty years next year. Engera USA is the sister organisation of Engera; together we support eight health facilities caring for more than 230,000 people each year in Ethiopia's Gurage Zone and Oromia's South West Shewa.",
          { rows: 5 },
        ),
        video("hero_video", "Video", "/videos/about.mp4"),
        image("hero_video_poster", "Video cover image", "/videos/about-poster.jpg"),
      ],
    },
    {
      id: "vision",
      label: "Vision & mission",
      hideable: true,
      fields: [
        text("vision_eyebrow", "Vision — small heading", "Our vision"),
        area(
          "vision_text",
          "Vision",
          "Healthy communities in the Gurage Zone and the parts of Oromia where we work, and access to quality health care for all who need it.",
        ),
        text("mission_eyebrow", "Mission — small heading", "Our mission"),
        area(
          "mission_text",
          "Mission",
          "Engera improves the health of women and children in Ethiopia's Gurage Zone and Oromia region by partnering with local communities to promote well-being and prevent disease.",
        ),
      ],
    },
    {
      id: "believe",
      label: "What we believe",
      hideable: true,
      fields: [
        image("believe_image", "Photo", "builtin:photos/community.jpg"),
        text(
          "believe_image_alt",
          "Photo description",
          "Community members gathered outside an Engera-supported health center",
        ),
        text("believe_eyebrow", "Small heading", "What we believe"),
        text("believe_heading", "Heading", "Good health is the foundation of a thriving society."),
        area(
          "believe_body",
          "Text",
          "Every activity we undertake is done in collaboration with the Ethiopian people. Our goal is to build skills and knowledge that contribute to a healthier population, supported by quality and accessible health care.\n\nThe association works closely with the Ethiopian Catholic Church (Eparchy of Emdbir), but supports patients of all ethnic and religious backgrounds.",
          { rows: 8, help: PARAGRAPH_HELP },
        ),
      ],
    },
    {
      id: "history",
      label: "Our history",
      hideable: true,
      fields: [
        text("history_eyebrow", "Small heading", "Our history"),
        text(
          "history_heading",
          "Heading",
          "From Addis Ababa orphanages to a network of rural health centers",
        ),
        {
          key: "timeline",
          label: "Timeline",
          type: "list",
          itemLabel: "milestone",
          titleKey: "title",
          fields: [
            { key: "year", label: "Year / date", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "body", label: "Text", type: "textarea" },
          ],
          default: [
            {
              year: "Before 2007",
              title: "How it began",
              body: "Medical volunteers from Tuscany begin providing medical assistance and training to orphanages in Addis Ababa. The name Engera refers to the Ethiopian bread made from teff flour.",
            },
            {
              year: "2007",
              title: "Engera is officially founded",
              body: "Engera is formally established and shifts its support to the Gurage Zone, collaborating with local, Italian and international partners — with a particular focus on maternal and child health.",
            },
            {
              year: "2008",
              title: "Zizencho Health Center is built",
              body: "A new health center rises in an isolated highland village with no road, electricity or running water. It grows into one of the busiest facilities in the network.",
            },
            {
              year: "2014 – 2021",
              title: "The network grows",
              body: "Shebraber (2014) and San Marco (2021) join the network, alongside long-running support for Burat, Gura Megenesse and Getche.",
            },
            {
              year: "Other works",
              title: "Into Oromia: the Galeya Rogdha clinic",
              body: "The clinic at Galeya Rogdha, in Oromia's South West Shewa zone, was developed with Engera's support — bringing preventive care, infant immunisation and pre/post-natal services to a remote village, alongside a school programme.",
            },
          ],
        },
        text("today_eyebrow", "“Today” — small heading", "Where we are today"),
        text("today_heading", "“Today” — heading", "A growing network, not a single project"),
        area(
          "today_body",
          "“Today” — text",
          "Today, Engera continues to support a growing network of health facilities across the Gurage Zone and Oromia — providing maternal and child health care, training local medical staff, and investing in the community health infrastructure that keeps those services running.\n\nOur work spans multiple sites at once: medicines and diagnostics, maternity and tuberculosis wards, solar power and clean water, scholarships and clinical training, and education programmes in the villages around the facilities.",
          { rows: 8, help: PARAGRAPH_HELP },
        ),
      ],
    },
    {
      id: "team",
      label: "Our team",
      hideable: true,
      fields: [
        text("team_eyebrow", "Small heading", "Our team"),
        text("team_heading", "Heading", "The people behind the care"),
        area(
          "team_intro",
          "Intro text",
          "Clinicians, business leaders and fundraisers in the US, Italy, the UK and Ethiopia — most of whom have travelled to the facilities themselves.",
        ),
        image("team_bg_image", "Faded background photo", "builtin:photos/staff.jpg"),
        {
          key: "team_groups",
          label: "Team groups",
          type: "list",
          itemLabel: "group",
          titleKey: "heading",
          help: "Groups appear in this order. A group with one person gets the large, single-person layout.",
          fields: [
            { key: "label", label: "Small heading", type: "text", half: true },
            { key: "heading", label: "Heading", type: "text", half: true },
            {
              key: "id",
              label: "Group code",
              type: "text",
              help: "A short unique code people are assigned to (e.g. board).",
            },
          ],
          default: teamGroupDefaults,
        },
        {
          key: "team_members",
          label: "People",
          type: "list",
          itemLabel: "person",
          titleKey: "name",
          thumbKey: "photo",
          fields: [
            {
              key: "group",
              label: "Group",
              type: "select",
              optionsFrom: { list: "team_groups", value: "id", label: "heading" },
            },
            { key: "name", label: "Name", type: "text", half: true },
            { key: "role", label: "Role", type: "text", half: true },
            { key: "photo", label: "Photo", type: "image", help: "Leave empty to show initials." },
            { key: "bio", label: "Bio", type: "textarea", rows: 5 },
          ],
          default: teamMemberDefaults,
        },
        text("team_support_label", "Orange button", "Support our work", { half: true }),
        text("team_involved_label", "Outline button", "Get involved", { half: true }),
      ],
    },
    seo(
      "About Us — Engera USA",
      "Founded in 2007 by medical volunteers, Engera works with communities in Ethiopia's Gurage Zone and Oromia's South West Shewa to improve maternal and child health.",
      "Our story, mission and the people behind Engera USA's work in rural Ethiopia.",
    ),
  ],
};

const IMPACT: PageSchema = {
  key: "impact",
  label: "Impact",
  path: "/impact",
  description: "Work areas (tabs), figures, testimonials, video and the annual report.",
  sections: [
    {
      id: "hero",
      label: "Hero banner",
      fields: [
        text("hero_eyebrow", "Small heading", "Our impact"),
        text(
          "hero_heading",
          "Headline",
          "A solar panel. A trained midwife. A lab that works all day.",
        ),
        area(
          "hero_subtext",
          "Intro text",
          "Small, specific improvements change what a rural clinic can do. Here is where your support goes — and what it has already made possible.",
        ),
        image("hero_image", "Background photo", "builtin:photos/healthcare-real.jpg"),
        text(
          "hero_image_alt",
          "Photo description",
          "A nurse caring for a patient at an Engera-supported health centre",
        ),
      ],
    },
    {
      id: "pillars",
      label: "Areas of work (tabs)",
      hideable: true,
      fields: [
        {
          key: "pillars",
          label: "Tabs",
          type: "list",
          itemLabel: "tab",
          titleKey: "label",
          thumbKey: "photo",
          fields: [
            { key: "label", label: "Tab name", type: "text" },
            { key: "heading", label: "Heading", type: "text" },
            { key: "body", label: "Text", type: "textarea", rows: 7, help: PARAGRAPH_HELP },
            { key: "points", label: "Bullet points (one per line)", type: "lines" },
            { key: "photo", label: "Photo", type: "image" },
            { key: "alt", label: "Photo description", type: "text" },
          ],
          default: [
            {
              label: "Healthcare",
              heading: "Care that reaches mothers and children first",
              photo: "builtin:photos/baby-weighed.jpg",
              alt: "Health centre staff weighing and checking a baby",
              body: "Across the eight facilities we support, more than 230,000 people live within the catchment areas we serve — and over 239,000 patient visits were recorded in 2025, including 2,600+ safe deliveries.\n\nEngera supplies medicines, diagnostic tools and delivery equipment, and coordinates visiting medical teams several times a year alongside the Ethiopian staff and religious sisters who run each facility.",
              points: [
                "Antenatal, delivery and postnatal care",
                "Infant immunisation and child health",
                "Tuberculosis diagnosis and treatment",
                "Laboratory diagnostics and medicines",
              ],
            },
            {
              label: "Infrastructure",
              heading: "Buildings, water and power that make care possible",
              photo: "builtin:photos/infrastructure-site.jpg",
              alt: "Solar panels installed beside a rural Ethiopian health centre",
              body: "Zizencho was built in 2008 in a village with no road, electricity, or running water. Shebraber followed in 2014. Getche's maternity ward was rebuilt to give expectant mothers proper reception facilities.\n\nAcross the network, solar panels now provide stable, sustainable power — so a delivery at 2am no longer depends on a torchlight.",
              points: [
                "Solar installations across the facility network",
                "Water well at Zizencho Health Center",
                "Maternity ward development at Getche",
                "Renovation of Burat Health Center",
              ],
            },
            {
              label: "Education",
              heading: "Keeping children — and especially girls — in school",
              photo: "builtin:photos/education.jpg",
              alt: "Schoolgirls in a village supported by Engera",
              body: "Health and schooling are inseparable in the villages where we work. At Galeya Rogdha, in Oromia's South West Shewa, Engera supports a preschool meal programme so the youngest children arrive at class fed, and has contributed to improvements in the school facilities themselves.\n\nThrough a partnership with Adey Pads, girls receive reusable sanitary pads — as Sister Surabhila puts it, more than a thousand girls can now attend school confidently and without interruption.",
              points: [
                "Preschool meal programme at Galeya Rogdha",
                "School facility improvements in the villages we serve",
                "Reusable sanitary pads with Adey Pads",
                "Health education alongside school programmes",
              ],
            },
            {
              label: "Training",
              heading: "Skills that stay in the community",
              photo: "builtin:photos/training-site.jpg",
              alt: "Nurses taking part in an Engera-supported training session",
              body: "Equipment only helps if someone is trained to use it. Engera funds scholarships and clinical training for the nurses, midwives and laboratory staff who work in the facilities year-round — including neonatal resuscitation courses at Attat, the referral hospital for the region.\n\nAs one clinical nurse at Burat described it, the Attat training made a real difference — especially the neonatal resuscitation skills. Training is delivered with the visiting medical teams and continues between missions.",
              points: [
                "Neonatal resuscitation training at Attat",
                "Gynaecology and obstetrics nurse training",
                "Scholarships for continuing professional development",
                "Mentoring by visiting doctors and midwives",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "numbers",
      label: "By the numbers",
      description: "The numbers are shared with the Home page, so they're edited in one place.",
      link: { label: "Edit the numbers", page: "global", section: "figures" },
      hideable: true,
      fields: [
        text("numbers_eyebrow", "Small heading", "By the numbers"),
        text("numbers_heading", "Heading", "The scale of the work"),
      ],
    },
    {
      id: "voices",
      label: "Voices (testimonials)",
      description:
        "The quotes come from Testimonials — switch “Show on Impact page” there to choose which appear.",
      link: { label: "Manage testimonials", route: "/admin/testimonials" },
      hideable: true,
      fields: [
        text("voices_eyebrow", "Small heading", "Voices"),
        text("voices_heading", "Heading", "From the staff and communities we work with"),
        video("voices_video", "Video under the quotes", "/videos/impact.mp4", {
          help: "Clear it to remove the video.",
        }),
        image("voices_video_poster", "Video cover image", "/videos/impact-poster.jpg"),
      ],
    },
    {
      id: "report",
      label: "Annual report download",
      hideable: true,
      fields: [
        text("report_eyebrow", "Small heading", "2025 Annual Report"),
        text("report_heading", "Heading", "Download Our Annual Impact Report"),
        area(
          "report_body",
          "Text",
          "A detailed look at the patients served, deliveries attended and communities reached across our eight facilities in 2025.",
        ),
        text("report_button", "Button text", "Download 2025 Report"),
        {
          key: "report_file",
          label: "Report file (PDF)",
          type: "file",
          default: "#",
          help: "Upload the PDF, or paste a link to it.",
        },
        image("report_bg", "Faded background photo", "builtin:photos/community.jpg"),
      ],
    },
    seo(
      "Our Impact — Engera USA",
      "Over 239,000 patients treated a year and 2,600+ safe deliveries in 2025 across eight facilities: healthcare, infrastructure, education and training in rural Ethiopia.",
      "Healthcare, infrastructure, education and training — where support for Engera USA goes.",
    ),
  ],
};

const PROJECTS: PageSchema = {
  key: "projects",
  label: "Projects",
  path: "/projects",
  description: "Map of facilities. The facilities themselves are edited under Facilities.",
  sections: [
    {
      id: "hero",
      label: "Opening",
      fields: [
        text("hero_eyebrow", "Small heading", "Projects"),
        text(
          "hero_heading",
          "Headline",
          "Eight facilities in the Gurage Zone and Oromia's South West Shewa",
        ),
        area(
          "hero_body",
          "Intro text",
          "The map opens on Africa and zooms in to the highlands south-west of Addis Ababa. Select a facility to move the map, click a pin for a summary, or open a facility page directly from the list.",
        ),
      ],
    },
    {
      id: "map",
      label: "Facility list & map",
      description: "The facilities, pins and photos themselves are edited under Facilities.",
      link: { label: "Manage facilities", route: "/admin/facilities" },
      fields: [
        text("list_label", "List heading", "Facilities"),
        text("map_button", "“Show on map” button", "Map", { half: true }),
        text("clear_label", "“Clear” link", "Clear selection", { half: true }),
      ],
    },
    {
      id: "all",
      label: "All facilities",
      hideable: true,
      fields: [text("all_heading", "Heading", "All facilities")],
    },
    seo(
      "Projects & Facilities — Engera USA",
      "Explore the eight health facilities Engera USA supports across Ethiopia's Gurage Zone and Oromia's South West Shewa on an interactive map.",
      "An interactive map of the health centers and clinics Engera USA supports in rural Ethiopia.",
    ),
  ],
};

const FACILITY: PageSchema = {
  key: "facility",
  label: "Facility page (template)",
  path: "/projects/burat-health-center",
  description:
    "The wording shared by every facility's own page. Use {name} for the facility's name.",
  sections: [
    {
      id: "main",
      label: "Facility details",
      description:
        "Each facility's own name, photo, text, key facts and work list are edited under Facilities.",
      link: { label: "Manage facilities", route: "/admin/facilities" },
      fields: [
        text("back_label", "Back link", "← All projects"),
        text("work_heading", "“Work” heading", "The work at {name}"),
        area(
          "figures_note",
          "Figures footnote",
          "Catchment population and patient figures are FY2025, from the Ethiopian Catholic Church Social and Development Commission plan and achievement data for the eight facilities Engera supports.",
        ),
        text("support_label", "Donate button", "Support this work"),
      ],
    },
    {
      id: "location",
      label: "Location map",
      fields: [
        text("location_label", "Heading", "Location"),
        text(
          "map_hint",
          "Hint",
          "Select any other facility on the map to jump straight to its page.",
        ),
        area(
          "no_photo_note",
          "Note when a facility has no photo",
          "We don't yet have a photograph of this facility that we can publish. Rather than use a generic stock image, we show a placeholder until our team can share real photos.",
        ),
      ],
    },
    {
      id: "voices",
      label: "Voices from the facility",
      hideable: true,
      fields: [
        text("voices_eyebrow", "Small heading", "Voices from {name}"),
        text("voices_heading", "Heading", "What staff and community members say"),
      ],
    },
    {
      id: "others",
      label: "Other facilities",
      hideable: true,
      fields: [text("others_heading", "Heading", "Other facilities")],
    },
  ],
};

const GET_INVOLVED: PageSchema = {
  key: "get-involved",
  label: "Get Involved",
  path: "/get-involved",
  description: "Donate, volunteer and partner cards.",
  sections: [
    {
      id: "hero",
      label: "Opening",
      fields: [
        text("hero_eyebrow", "Small heading", "Get involved"),
        text("hero_heading", "Headline", "There are three ways to make this work possible."),
        area(
          "hero_body",
          "Intro text",
          "Whether you donate, use your skills on the ground, or partner with us as an organisation, your support helps provide care for mothers and children in rural Ethiopia.",
        ),
      ],
    },
    {
      id: "ways",
      label: "Ways to help (cards)",
      hideable: true,
      fields: [
        {
          key: "ways",
          label: "Cards",
          type: "list",
          itemLabel: "card",
          titleKey: "title",
          fields: [
            {
              key: "style",
              label: "Card style",
              type: "select",
              options: [
                { value: "donate", label: "White card, orange button" },
                { value: "join", label: "Warm card, rounded" },
                { value: "partner", label: "Navy card" },
              ],
            },
            { key: "kicker", label: "Small heading", type: "text", half: true },
            { key: "title", label: "Title", type: "text", half: true },
            { key: "body", label: "Text", type: "textarea" },
            { key: "points", label: "Bullet points (one per line)", type: "lines" },
            { key: "button_label", label: "Button text", type: "text" },
            { key: "button_link", label: "Button link", type: "url", help: LINK_HELP },
          ],
          default: [
            {
              style: "donate",
              kicker: "Give",
              title: "Donate",
              body: "Donations fund the essentials: medicines and diagnostics, solar power, maternity equipment and staff training. Every gift goes to the facilities themselves.",
              points: [
                "One-off or recurring gifts",
                "US tax-deductible through Engera USA",
                "Restricted giving to a specific facility on request",
              ],
              button_label: "Donate now",
              button_link: "{donate}",
            },
            {
              style: "join",
              kicker: "Serve",
              title: "Volunteer",
              body: "Doctors, nurses, midwives and technical volunteers travel to our facilities to support clinical work, training and outreach. Skilled remote volunteering is welcome too.",
              points: [
                "Clinical placements and visiting teams",
                "Training and mentoring for local staff",
                "Remote support: grants, translation, data, design",
              ],
              button_label: "Email Us",
              button_link: "mailto:{email}?subject=Volunteering",
            },
            {
              style: "partner",
              kicker: "Build",
              title: "Partner",
              body: "We work with foundations, companies, hospitals and faith communities — from solar installations with NextEnergy Foundation to keeping girls in school with Adey Pads.",
              points: [
                "Corporate and foundation partnerships",
                "Institutional and hospital collaborations",
                "Community fundraising and events",
              ],
              button_label: "Start a conversation",
              button_link: "mailto:{email}?subject=Partnership",
            },
          ],
        },
      ],
    },
    {
      id: "not-sure",
      label: "“Not sure where to start?”",
      hideable: true,
      fields: [
        video("not_sure_video", "Video", "/videos/get-involved.mp4"),
        image("not_sure_poster", "Video cover image", "/videos/get-involved-poster.jpg"),
        text("not_sure_heading", "Heading", "Not sure where to start?"),
        area(
          "not_sure_body",
          "Text",
          "Tell us a little about what you'd like to do and we'll point you to the facility or programme where it will matter most.",
        ),
        text("not_sure_donate_label", "Orange button", "Donate", { half: true }),
        text("not_sure_contact_label", "Outline button", "Contact us", { half: true }),
      ],
    },
    seo(
      "Get Involved — Engera USA",
      "Donate, volunteer or partner with Engera USA to strengthen rural health care in Ethiopia's Gurage Zone and Oromia region.",
      "Three ways to help: give, volunteer your skills, or partner with us.",
    ),
  ],
};

const CONTACT: PageSchema = {
  key: "contact",
  label: "Contact",
  path: "/contact",
  description: "Contact form and contact details. Email/phone/address are in Settings.",
  sections: [
    {
      id: "hero",
      label: "Opening",
      fields: [
        text("hero_eyebrow", "Small heading", "Contact"),
        text("hero_heading", "Headline", "Start a conversation with us"),
        area(
          "hero_body",
          "Intro text",
          "Questions about the facilities, giving, volunteering or partnerships — the form on this page reaches the right person fastest.",
        ),
      ],
    },
    {
      id: "form",
      label: "Contact form",
      fields: [
        text("form_heading", "Heading", "Send a message"),
        text("form_name_label", "“Name” label", "Name", { half: true }),
        text("form_email_label", "“Email” label", "Email", { half: true }),
        text("form_topic_label", "“Topic” label", "What's this about?"),
        area(
          "form_topics",
          "Topic choices (one per line)",
          "General enquiry\nDonating\nVolunteering\nPartnership\nPress & media",
          { rows: 5 },
        ),
        text("form_message_label", "“Message” label", "Message"),
        text("form_button", "Send button", "Send message"),
        text(
          "form_note",
          "Small print",
          "Your message opens in your email app and is sent to {email}.",
          { help: "{email} is replaced with the contact email from Settings." },
        ),
      ],
    },
    {
      id: "details",
      label: "Contact details",
      fields: [
        text("info_email_eyebrow", "Email — small heading", "Email"),
        area(
          "info_note",
          "Note",
          "The quickest route to the right person is the form on this page.",
        ),
        text("sister_eyebrow", "Sister org — small heading", "Sister organization"),
        text("sister_label", "Sister org — link text", "engera.org", { half: true }),
        url("sister_url", "Sister org — link", ORG.sister, { half: true }),
      ],
    },
    {
      id: "give",
      label: "“Ready to give?” box",
      hideable: true,
      fields: [
        text("give_heading", "Heading", "Ready to give?"),
        area(
          "give_body",
          "Text",
          "Donations go straight to the facilities and the staff who run them.",
        ),
        text("give_button", "Button", "Donate"),
      ],
    },
    seo(
      "Contact — Engera USA",
      "Get in touch with Engera USA about donating, volunteering, partnerships or our health facilities in Ethiopia.",
      "Questions about our work in the Gurage Zone and Oromia? Send us a message.",
    ),
  ],
};

const GLOBAL: PageSchema = {
  key: "global",
  label: "Header & footer",
  path: "/",
  description: "Menu, footer, donate banner, newsletter and key figures — shared by every page.",
  sections: [
    {
      id: "header",
      label: "Header & menu",
      fields: [
        text("nav_home", "Menu: Home", "Home", { half: true }),
        text("nav_about", "Menu: About", "About Us", { half: true }),
        text("nav_impact", "Menu: Impact", "Impact", { half: true }),
        text("nav_projects", "Menu: Projects", "Projects", { half: true }),
        text("nav_get_involved", "Menu: Get Involved", "Get Involved", { half: true }),
        text("nav_contact", "Menu: Contact", "Contact", { half: true }),
        text("header_donate_label", "Donate button", "Donate", { half: true }),
        text("mobile_menu_title", "Phone menu title", "Menu", { half: true }),
      ],
    },
    {
      id: "figures",
      label: "Key figures",
      description: "The counting-up numbers on the Home and Impact pages.",
      virtual: true,
      fields: [
        {
          key: "home_stats",
          label: "Home — first row",
          type: "list",
          itemLabel: "figure",
          titleKey: "label",
          fields: statFields,
          default: [
            {
              value: 8,
              suffix: "",
              label: "Health facilities supported",
              note: "Gurage Zone and Oromia's South West Shewa",
              plain: false,
            },
            {
              value: 500000,
              suffix: "+",
              label: "People served",
              note: "All-time, since Engera was founded",
              plain: false,
            },
            {
              value: 30000,
              suffix: "+",
              label: "Patients a year at Zizencho",
              note: "In a village with no road in 2008",
              plain: false,
            },
            {
              value: 2007,
              suffix: "",
              label: "Working since",
              note: "Founded by medical volunteers from Tuscany",
              plain: true,
            },
          ],
        },
        {
          key: "annual_stats",
          label: "Annual reach (Home shows the first 3, Impact shows all)",
          type: "list",
          itemLabel: "figure",
          titleKey: "label",
          fields: statFields,
          default: [
            {
              value: 230000,
              suffix: "+",
              label: "People in our catchment areas",
              note: "Current annual reach across 8 facilities (FY2025)",
              plain: false,
            },
            {
              value: 239000,
              suffix: "+",
              label: "Patients treated a year",
              note: "Outpatient visits achieved in FY2025",
              plain: false,
            },
            {
              value: 2600,
              suffix: "+",
              label: "Safe deliveries (2025)",
              note: "Mothers supported through delivery",
              plain: false,
            },
            {
              value: 8,
              suffix: "",
              label: "Supported health facilities",
              note: "Gurage Zone and Oromia's South West Shewa",
              plain: false,
            },
          ],
        },
      ],
    },
    {
      id: "cta",
      label: "Donate banner",
      description: "The navy banner above the footer.",
      fields: [
        text("cta_heading", "Heading", "Your gift keeps the lights on."),
        area(
          "cta_body",
          "Text",
          "Solar panels, safe deliveries, medicines and training — funded by people who believe rural health care shouldn't be a lottery.",
        ),
        text("cta_label", "Button", "Donate to Engera USA"),
      ],
    },
    {
      id: "footer",
      label: "Footer",
      fields: [
        area(
          "footer_blurb",
          "About text",
          "A nonprofit supporting 8 rural health facilities serving more than 230,000 people each year in Ethiopia's Gurage Zone and Oromia's South West Shewa.",
        ),
        text("footer_donate_label", "Donate button", "Donate today"),
        text("footer_newsletter_heading", "Newsletter — small heading", "Newsletter"),
        text(
          "footer_newsletter_text",
          "Newsletter — text",
          "Occasional updates from the facilities we support.",
        ),
        text("footer_explore_heading", "Menu column heading", "Explore"),
        text("footer_worldwide_heading", "Partner links heading", "Engera worldwide"),
        {
          key: "footer_worldwide_links",
          label: "Partner links",
          type: "list",
          itemLabel: "link",
          titleKey: "label",
          fields: [
            { key: "label", label: "Text", type: "text", half: true },
            { key: "url", label: "Link", type: "url", half: true },
          ],
          default: [
            { label: "Engera UK", url: ORG.uk },
            { label: "Engera (Italy)", url: ORG.sister },
          ],
        },
        text("footer_facilities_heading", "Facilities column heading", "Facilities"),
        text("footer_copyright", "Copyright line", "Engera USA. All rights reserved.", {
          help: "The © and current year are added automatically.",
        }),
        text("footer_sister_text", "Bottom line — text", "Sister organization of", { half: true }),
        text("footer_sister_name", "Bottom line — link text", "Engera", { half: true }),
        url("footer_sister_url", "Bottom line — link", ORG.sister),
      ],
    },
    {
      id: "newsletter-form",
      label: "Newsletter form",
      virtual: true,
      fields: [
        text("newsletter_placeholder", "Email box placeholder", "you@example.com"),
        text("newsletter_button", "Button", "Subscribe"),
        text(
          "newsletter_thanks",
          "Thank-you message",
          "Thank you — we'll be in touch with our next update.",
        ),
      ],
    },
    {
      id: "cards",
      label: "Facility cards",
      virtual: true,
      fields: [text("card_link_label", "Card link text", "View details →")],
    },
    {
      id: "seo",
      label: "Site-wide SEO",
      virtual: true,
      fields: [
        text("site_title", "Default page title", "Engera USA — Rural health care in Ethiopia"),
        area(
          "site_description",
          "Default description",
          "Engera USA supports eight rural health facilities serving more than 230,000 people a year in Ethiopia's Gurage Zone and Oromia's South West Shewa.",
        ),
      ],
    },
  ],
};

export const PAGES: PageSchema[] = [
  HOME,
  ABOUT,
  IMPACT,
  PROJECTS,
  FACILITY,
  GET_INVOLVED,
  CONTACT,
  GLOBAL,
];

export type PageKey = string;

const BY_KEY = new Map(PAGES.map((p) => [p.key, p]));

export function getPageSchema(page: string): PageSchema | undefined {
  return BY_KEY.get(page);
}

export function isPageKey(page: string): boolean {
  return BY_KEY.has(page);
}

export const HIDE_PREFIX = "__hide.";

export function allFields(page: string): Field[] {
  return getPageSchema(page)?.sections.flatMap((s) => s.fields) ?? [];
}

export function fieldFor(page: string, key: string): Field | undefined {
  return allFields(page).find((f) => f.key === key);
}

/** Keys the database is allowed to hold for this page. */
export function validKeys(page: string): Set<string> {
  const schema = getPageSchema(page);
  const keys = new Set<string>();
  if (!schema) return keys;
  for (const s of schema.sections) {
    if (s.hideable) keys.add(HIDE_PREFIX + s.id);
    for (const f of s.fields) keys.add(f.key);
  }
  return keys;
}

export function serializeDefault(field: Field): string {
  return field.type === "list" ? JSON.stringify(field.default) : field.default;
}

/** Every field's default, serialised as the database would store it. */
export function defaultsFor(page: string): Record<string, string> {
  return Object.fromEntries(allFields(page).map((f) => [f.key, serializeDefault(f)]));
}

/** Where to find the section a public-page block belongs to: "home:hero". */
export function sectionRef(page: string, section: string) {
  return `${page}:${section}`;
}

// ---------------------------------------------------------------------------
// Reading content in page components
// ---------------------------------------------------------------------------

export interface LinkVars {
  donate: string;
  email: string;
}

/** Fills {donate} / {email} placeholders in a link. */
export function resolveHref(href: string, vars: LinkVars): string {
  return (href || "#").replaceAll("{donate}", vars.donate).replaceAll("{email}", vars.email);
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function paragraphs(textValue: string): string[] {
  return textValue
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function lines(textValue: string): string[] {
  return textValue
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Accepts a YouTube link in any common form, or a bare ID. */
export function youtubeId(value: string): string {
  const v = value.trim();
  const match =
    v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,})/) ?? null;
  return match?.[1] ?? v;
}

/**
 * A page's content, ready to read: `c.t("hero_heading")`, `c.img("hero_image")`,
 * `c.list("services")`, `c.visible("video")`… Always falls back to the
 * default, so a missing or broken value never leaves a blank gap.
 */
export class PageContent {
  private cache = new Map<string, unknown>();

  constructor(
    readonly page: string,
    private readonly raw: Record<string, string | undefined>,
  ) {}

  private field(key: string) {
    return fieldFor(this.page, key);
  }

  /** Plain text. */
  t(key: string, vars?: Record<string, string>): string {
    const f = this.field(key);
    const fallback = f && f.type !== "list" ? f.default : "";
    const value = this.raw[key];
    let out = value === undefined || value === null ? fallback : value;
    // Text fields never render empty unless the editor really cleared a non-required one.
    if (out.trim() === "" && f?.type !== "file" && f?.type !== "video" && f?.type !== "image") {
      out = fallback;
    }
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
    return out;
  }

  img(key: string): string {
    return mediaUrl(this.t(key));
  }

  paras(key: string): string[] {
    return paragraphs(this.t(key));
  }

  lines(key: string): string[] {
    return lines(this.t(key));
  }

  list<T = ListItem>(key: string): T[] {
    if (this.cache.has(key)) return this.cache.get(key) as T[];
    const f = this.field(key);
    const fallback = f?.type === "list" ? f.default : [];
    let parsed: unknown = fallback;
    const value = this.raw[key];
    if (value) {
      try {
        const candidate = JSON.parse(value) as unknown;
        if (Array.isArray(candidate)) parsed = candidate;
      } catch {
        // keep the default
      }
    }
    this.cache.set(key, parsed);
    return parsed as T[];
  }

  visible(sectionId: string): boolean {
    return this.raw[HIDE_PREFIX + sectionId] !== "true";
  }
}

export function contentOf(page: string, raw: Record<string, string | undefined> | undefined) {
  return new PageContent(page, raw ?? {});
}

/** Converts a list item's value to a string safely. */
export function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function strList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(str).filter((s) => s.trim() !== "");
  if (typeof value === "string") return lines(value);
  return [];
}

export const DEFAULT_DONATE_URL = DONATE_URL;
