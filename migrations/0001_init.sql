-- Engera USA admin CMS — initial schema
-- Run once per environment via:
--   npx wrangler d1 execute engera-db --remote --file=migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Free-form editable text per page. One row per field, e.g.
-- ('get-involved', 'not_sure_heading', 'Not sure where to start?')
CREATE TABLE IF NOT EXISTS page_content (
  page TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (page, field_key)
);

CREATE TABLE IF NOT EXISTS facilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT,
  lat REAL,
  lon REAL,
  short_description TEXT,   -- one-line blurb shown on cards and the map
  location_note TEXT,       -- e.g. "Near Endibir, Gurage Zone"
  description TEXT,         -- full text; blank line = new paragraph
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  legacy_id TEXT,           -- id of the matching built-in testimonial (keeps its photos); NULL for new ones
  quote TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  facility_slug TEXT REFERENCES facilities(slug),
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_testimonials_legacy_id
  ON testimonials(legacy_id) WHERE legacy_id IS NOT NULL;

-- Site-wide single values: donate URL, contact email/phone, footer blurb, etc.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
