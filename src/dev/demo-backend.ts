/**
 * DEMO MODE — local development only.
 *
 * When the site runs on your own computer with the plain dev server (`vite dev`)
 * there is no Cloudflare, so no D1 database and no R2 storage. This file stands
 * in for them so the admin dashboard works instantly, with practice data:
 *
 *   - "D1"  -> a SQLite database (sql.js) saved to  .dev-data/demo.sqlite
 *   - "R2"  -> plain files saved under              .dev-data/uploads/
 *   - login -> username "admin", password "admin123"
 *
 * It is NEVER part of the real website:
 *   1. cf-env.ts only reaches for it when `import.meta.env.DEV` is true
 *      (`vite dev` only — false in every production build), and
 *   2. production builds replace this whole file with an empty stub
 *      (see dev-demo/vite-plugin.ts).
 * So the deployed site can't contain this login or this data.
 */
import type { Database, SqlJsStatic } from "sql.js";

import type { CloudflareBindings } from "@/lib/cf-env";
import { hashPassword } from "@/lib/password";

export const DEMO_USERNAME = "admin";
export const DEMO_PASSWORD = "admin123";

const GLOBAL_KEY = Symbol.for("engera:demo-env");

/** One shared instance, kept on globalThis so hot-reloads don't reset it. */
export function getDemoEnv(): CloudflareBindings | null {
  const g = globalThis as unknown as Record<symbol, CloudflareBindings | undefined>;
  g[GLOBAL_KEY] ??= createDemoEnv();
  return g[GLOBAL_KEY] ?? null;
}

function createDemoEnv(): CloudflareBindings {
  return {
    DB: new DemoD1() as unknown as D1Database,
    MEDIA: new DemoR2() as unknown as R2Bucket,
    // Local-only placeholder; the demo never runs anywhere public.
    SESSION_SECRET: "engera-demo-only-session-secret-0123456789abcdef",
    R2_PUBLIC_BASE_URL: "/dev-uploads",
  };
}

async function nodeModules() {
  const [fs, path] = await Promise.all([import("node:fs"), import("node:path")]);
  const root = process.cwd();
  const dataDir = path.join(root, ".dev-data");
  return {
    fs,
    path,
    root,
    dataDir,
    dbFile: path.join(dataDir, "demo.sqlite"),
    uploadsDir: path.join(dataDir, "uploads"),
  };
}

type Row = Record<string, unknown>;

interface DemoResult {
  success: true;
  results: Row[];
  meta: { last_row_id: number; changes: number; duration: number };
}

class DemoStatement {
  constructor(
    private readonly owner: DemoD1,
    readonly sql: string,
    readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new DemoStatement(this.owner, this.sql, values);
  }

  async first<T = Row>(columnName?: string): Promise<T | null> {
    const { results } = await this.owner.execute(this.sql, this.params);
    const row = results[0];
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Row>(): Promise<DemoResult & { results: T[] }> {
    return (await this.owner.execute(this.sql, this.params)) as DemoResult & { results: T[] };
  }

  async run(): Promise<DemoResult> {
    return this.owner.execute(this.sql, this.params);
  }
}

const WRITE_SQL = /^\s*(insert|update|delete|replace|create|drop|alter)\b/i;

/** The small slice of Cloudflare's D1 API this website uses, backed by SQLite. */
class DemoD1 {
  private ready: Promise<Database> | null = null;
  private saveToDisk: (() => void) | null = null;

  prepare(sql: string) {
    return new DemoStatement(this, sql);
  }

  async execute(sql: string, params: unknown[]): Promise<DemoResult> {
    const db = await this.db();
    const result = this.executeSync(db, sql, params);
    if (WRITE_SQL.test(sql)) this.saveToDisk?.();
    return result;
  }

  /** Runs several statements all-or-nothing, like D1's batch(). */
  async batch(statements: DemoStatement[]): Promise<DemoResult[]> {
    const db = await this.db();
    db.run("BEGIN");
    try {
      const results = statements.map((s) => this.executeSync(db, s.sql, s.params));
      db.run("COMMIT");
      if (statements.some((s) => WRITE_SQL.test(s.sql))) this.saveToDisk?.();
      return results;
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }
  }

  private executeSync(db: Database, sql: string, params: unknown[]): DemoResult {
    const started = performance.now();
    const statement = db.prepare(sql);
    const results: Row[] = [];
    try {
      statement.bind(params.map(normalise) as never);
      while (statement.step()) results.push(statement.getAsObject());
    } finally {
      statement.free();
    }
    const isWrite = WRITE_SQL.test(sql);
    const lastId = isWrite
      ? Number(db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0)
      : 0;
    return {
      success: true,
      results,
      meta: {
        last_row_id: lastId,
        changes: isWrite ? db.getRowsModified() : 0,
        duration: performance.now() - started,
      },
    };
  }

  private db(): Promise<Database> {
    this.ready ??= this.init();
    return this.ready;
  }

  private async init(): Promise<Database> {
    const { fs, path, root, dataDir, dbFile, uploadsDir } = await nodeModules();
    fs.mkdirSync(uploadsDir, { recursive: true });

    const initSqlJs = (await import("sql.js")).default as (config: object) => Promise<SqlJsStatic>;
    const wasmPath = path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
    const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) });

    const save = () => {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(dbFile, db.export());
    };

    let db: Database;
    if (fs.existsSync(dbFile)) {
      db = new SQL.Database(fs.readFileSync(dbFile));
    } else {
      db = new SQL.Database();
      await seedDemoData(db, { fs, path, root, uploadsDir });
      fs.writeFileSync(dbFile, db.export());
      console.log(
        "[demo] Created a fresh practice database with sample content (.dev-data/demo.sqlite)",
      );
    }
    this.saveToDisk = save;
    return db;
  }
}

function normalise(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

type NodeBits = Pick<
  Awaited<ReturnType<typeof nodeModules>>,
  "fs" | "path" | "root" | "uploadsDir"
>;

async function seedDemoData(db: Database, { fs, path, root, uploadsDir }: NodeBits) {
  // 1) The real schema and the website's existing content — the same files a real
  //    Cloudflare database is set up with.
  for (const file of ["0001_init.sql", "0002_seed_existing_content.sql"]) {
    const full = path.join(root, "migrations", file);
    if (!fs.existsSync(full)) {
      throw new Error(`Demo mode needs ${full} (run the dev server from the project folder).`);
    }
    db.exec(fs.readFileSync(full, "utf8"));
  }

  // 2) The demo login.
  db.run("INSERT INTO admin_users (email, password_hash) VALUES (?, ?)", [
    DEMO_USERNAME,
    await hashPassword(DEMO_PASSWORD),
  ]);

  // 3) Sample photos, so there are pictures to see without uploading anything.
  const demoUploads = path.join(uploadsDir, "demo");
  fs.mkdirSync(demoUploads, { recursive: true });
  for (const name of ["demo-clinic.jpg", "demo-person.jpg"]) {
    const source = path.join(root, "dev-demo", "sample-photos", name);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(demoUploads, name));
  }

  // 4) Extra practice content, so every kind of screen has something in it.
  db.run(
    `INSERT INTO facilities
       (slug, name, region, lat, lon, short_description, location_note, description, photo_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "demo-community-clinic",
      "Demo Community Clinic",
      "Gurage Zone",
      8.06,
      37.86,
      "A sample facility that only exists in your demo — edit or delete it freely.",
      "Demo location, Gurage Zone",
      "This facility is practice data. Try changing this text, swapping the photo, moving its pin by editing the latitude and longitude, or deleting it altogether.\n\nThen open the website's Projects page to see the map and the facility's own page update.",
      "/dev-uploads/demo/demo-clinic.jpg",
      9,
    ],
  );
  db.run(
    `INSERT INTO testimonials (quote, name, title, facility_slug, photo_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "Since the solar panels went in, our maternity ward never goes dark. (Demo testimonial)",
      "Demo Nurse",
      "Nurse, Demo Community Clinic",
      "demo-community-clinic",
      "/dev-uploads/demo/demo-person.jpg",
      6,
    ],
  );
  db.run(`INSERT INTO testimonials (quote, name, title, sort_order) VALUES (?, ?, ?, ?)`, [
    "I volunteered for two weeks and the team made me feel part of the community. (Demo testimonial)",
    "Demo Volunteer",
    "Volunteer",
    7,
  ]);
  db.run("INSERT INTO settings (key, value) VALUES (?, ?), (?, ?)", [
    "contact_phone",
    "+251 11 555 0100 (demo)",
    "contact_address",
    "Bole, Addis Ababa, Ethiopia (demo)",
  ]);
}

/** The slice of Cloudflare's R2 API this website uses, backed by plain files. */
class DemoR2 {
  // Loaded once, up front: after the dev server hot-reloads, a fresh dynamic import from this
  // (long-lived) object would fail with "Vite module runner has been closed".
  private readonly mods = nodeModules();

  async put(key: string, value: ArrayBuffer | ArrayBufferView | string | null) {
    const { fs, path, uploadsDir } = await this.mods;
    const target = path.normalize(path.join(uploadsDir, key));
    if (!target.startsWith(uploadsDir + path.sep)) throw new Error("Invalid upload path");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const bytes =
      value === null
        ? Buffer.alloc(0)
        : typeof value === "string"
          ? Buffer.from(value)
          : ArrayBuffer.isView(value)
            ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
            : Buffer.from(value);
    fs.writeFileSync(target, bytes);
    return { key, size: bytes.byteLength };
  }

  async delete(key: string) {
    const { fs, path, uploadsDir } = await this.mods;
    const target = path.normalize(path.join(uploadsDir, key));
    if (target.startsWith(uploadsDir + path.sep) && fs.existsSync(target)) fs.unlinkSync(target);
  }
}
