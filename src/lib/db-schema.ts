/**
 * Keeps the admin database's tables up to date automatically.
 *
 * The first time the website talks to the database (per server instance) this
 * makes sure every table exists and adds any newer columns that an older
 * database is missing. Every step is safe to repeat and never deletes data,
 * so there is no extra SQL to run by hand after updating the website.
 */

const BASE_TABLES = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS page_content (
    page TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (page, field_key)
  )`,
  `CREATE TABLE IF NOT EXISTS facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    region TEXT,
    lat REAL,
    lon REAL,
    short_description TEXT,
    location_note TEXT,
    description TEXT,
    photo_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legacy_id TEXT,
    quote TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    facility_slug TEXT REFERENCES facilities(slug),
    photo_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Failed sign-in attempts, to lock out password guessing.
  `CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    first_at INTEGER NOT NULL,
    locked_until INTEGER NOT NULL DEFAULT 0
  )`,
  // New: every uploaded file (photo, video, PDF), for the Media library.
  `CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storage_key TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    filename TEXT,
    content_type TEXT,
    size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

/** Columns added after the first release: [table, column, definition, run-after-adding]. */
const NEW_COLUMNS: [string, string, string, string?][] = [
  ["facilities", "photo_alt", "TEXT"],
  ["facilities", "facts_json", "TEXT"],
  ["facilities", "work_json", "TEXT"],
  ["facilities", "hidden", "INTEGER NOT NULL DEFAULT 0"],
  ["testimonials", "source", "TEXT"],
  ["testimonials", "photos_json", "TEXT"],
  [
    "testimonials",
    "show_on_impact",
    "INTEGER NOT NULL DEFAULT 1",
    // Matches the old website, which kept Dr Eyosiyas's quote off the Impact page.
    "UPDATE testimonials SET show_on_impact = 0 WHERE legacy_id = 'eyosiyas'",
  ],
];

// One check per server instance. (On Cloudflare the `DB` object can differ per
// request while pointing at the same database, so don't key this on it.)
let ready: Promise<void> | null = null;

async function migrate(DB: D1Database) {
  await DB.batch(BASE_TABLES.map((sql) => DB.prepare(sql)));
  await DB.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_testimonials_legacy_id ON testimonials(legacy_id) WHERE legacy_id IS NOT NULL",
  ).run();

  const tables = [...new Set(NEW_COLUMNS.map(([t]) => t))];
  const existing = new Map<string, Set<string>>();
  for (const table of tables) {
    const { results } = await DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    existing.set(table, new Set(results.map((r) => r.name)));
  }
  for (const [table, column, definition, after] of NEW_COLUMNS) {
    if (existing.get(table)?.has(column)) continue;
    try {
      await DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
      if (after) await DB.prepare(after).run();
    } catch (error) {
      // Another request may have added it a moment ago — only rethrow real problems.
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }
  }
}

/** Call before touching the database. Cheap after the first call. */
export function ensureSchema(DB: D1Database): Promise<void> {
  if (!ready) {
    ready = migrate(DB).catch((error) => {
      ready = null; // try again on the next request
      throw error;
    });
  }
  return ready;
}
