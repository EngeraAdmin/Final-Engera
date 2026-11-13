import { createServerFn } from "@tanstack/react-start";
import {
  getSession,
  updateSession,
  clearSession,
  getRequestHeader,
} from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getCloudflareEnv, isDemoMode } from "@/lib/cf-env";
import { DEMO_PASSWORD, DEMO_USERNAME } from "@/dev/demo-backend";
import { verifyPassword } from "@/lib/password";
import { ensureSchema } from "@/lib/db-schema";

// ---------------------------------------------------------------------------
// Password-guessing protection: after too many wrong passwords, sign-in is
// paused for a while — per email address, and per internet connection (IP).
// ---------------------------------------------------------------------------
const WINDOW_MS = 15 * 60 * 1000; // failures are counted over 15 minutes…
const LOCK_MS = 15 * 60 * 1000; // …and a lockout lasts 15 minutes
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

interface AttemptRow {
  key: string;
  count: number;
  first_at: number;
  locked_until: number;
}

async function lockedFor(DB: D1Database, keys: string[], now: number): Promise<number> {
  const rows = await Promise.all(
    keys.map((k) =>
      DB.prepare("SELECT key, count, first_at, locked_until FROM login_attempts WHERE key = ?")
        .bind(k)
        .first<AttemptRow>(),
    ),
  );
  const until = Math.max(0, ...rows.map((r) => r?.locked_until ?? 0));
  return until > now ? until - now : 0;
}

async function recordFailure(DB: D1Database, key: string, limit: number, now: number) {
  const row = await DB.prepare(
    "SELECT key, count, first_at, locked_until FROM login_attempts WHERE key = ?",
  )
    .bind(key)
    .first<AttemptRow>();
  const fresh = !row || now - row.first_at > WINDOW_MS;
  const count = fresh ? 1 : row.count + 1;
  const firstAt = fresh ? now : row.first_at;
  const lockedUntil = count >= limit ? now + LOCK_MS : 0;
  await DB.prepare(
    `INSERT INTO login_attempts (key, count, first_at, locked_until) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET count = excluded.count, first_at = excluded.first_at,
       locked_until = excluded.locked_until`,
  )
    .bind(key, count, firstAt, lockedUntil)
    .run();
}

interface AdminSessionData {
  userId: number;
  email: string;
}

/**
 * TanStack Start's built-in sealed-cookie session — encrypted and signed, so
 * there's no separate "sessions" table to manage in D1. The password comes
 * from the SESSION_SECRET Cloudflare secret (see README for how to set it);
 * it must be at least 32 characters, per the underlying seal algorithm.
 */
function sessionConfig() {
  const { SESSION_SECRET } = getCloudflareEnv();
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return {
    password: SESSION_SECRET,
    name: "engera_admin",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      httpOnly: true,
      // Browsers refuse "Secure" cookies on plain http://localhost in some cases; the live
      // site is always https, so only the local dev server relaxes this.
      secure: !import.meta.env.DEV,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export const loginServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      // An email address, or a plain username (e.g. the demo's "admin").
      email: z.string().trim().min(1),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    let DB: D1Database;
    try {
      ({ DB } = getCloudflareEnv());
      sessionConfig(); // also checks the login secret is set
    } catch {
      return {
        ok: false as const,
        error:
          "The admin area isn't fully set up yet (database or login secret missing). Finish the one-time setup in README-ADMIN-SETUP.md, then try again.",
      };
    }

    await ensureSchema(DB);
    const email = data.email.trim().toLowerCase();
    const ip = getRequestHeader("cf-connecting-ip") ?? "unknown";
    const emailKey = `email:${email}`;
    const ipKey = `ip:${ip}`;
    const now = Date.now();

    const wait = await lockedFor(DB, [emailKey, ipKey], now);
    if (wait > 0) {
      const minutes = Math.max(1, Math.ceil(wait / 60000));
      return {
        ok: false as const,
        error: `Too many wrong attempts. For safety, sign-in is paused — try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      };
    }

    const row = await DB.prepare("SELECT id, email, password_hash FROM admin_users WHERE email = ?")
      .bind(email)
      .first<{ id: number; email: string; password_hash: string }>();

    // Same error for "no such user" and "wrong password" — don't reveal
    // which part was wrong.
    const genericError = {
      ok: false as const,
      error: "Incorrect email/username or password.",
    };
    const valid = row ? await verifyPassword(data.password, row.password_hash) : false;
    if (!row || !valid) {
      await recordFailure(DB, emailKey, MAX_PER_EMAIL, now);
      await recordFailure(DB, ipKey, MAX_PER_IP, now);
      return genericError;
    }

    await DB.prepare("DELETE FROM login_attempts WHERE key = ?").bind(emailKey).run();

    await updateSession(sessionConfig(), { userId: row.id, email: row.email });

    return { ok: true as const };
  });

/**
 * Tells the login page and dashboard whether they're running the local practice
 * demo — and, only then, which demo login to pre-fill. In every production build
 * this returns `{ demo: false }` and the demo file is an empty stub.
 */
export const getDemoInfoServerFn = createServerFn({ method: "GET" }).handler(async () =>
  isDemoMode()
    ? { demo: true as const, username: DEMO_USERNAME, password: DEMO_PASSWORD }
    : { demo: false as const },
);

export const logoutServerFn = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession(sessionConfig());
  return { ok: true as const };
});

/** Current admin session, or null if not logged in. Server-only — do not import this (or
 *  anything that imports `@tanstack/react-start/server`) directly into a route file; route
 *  files are bundled for the client too. Use `getAdminSessionServerFn` from route code instead. */
async function getAdminSession(): Promise<AdminSessionData | null> {
  let config: ReturnType<typeof sessionConfig>;
  try {
    config = sessionConfig();
  } catch {
    // Database/secret not connected yet (e.g. plain `vite dev`, or before the one-time
    // setup): treat as "not logged in" so /admin sends people to the login page, which
    // explains what's missing, instead of showing an error page.
    return null;
  }
  const session = await getSession<AdminSessionData>(config);
  if (!session.data.userId || !session.data.email) return null;
  // Removing an admin signs them out everywhere straight away.
  try {
    const { DB } = getCloudflareEnv();
    const user = await DB.prepare("SELECT id FROM admin_users WHERE id = ?")
      .bind(session.data.userId)
      .first<{ id: number }>();
    if (!user) return null;
  } catch {
    return null;
  }
  return { userId: session.data.userId, email: session.data.email };
}

/**
 * RPC-safe wrapper around getAdminSession — this is what route `beforeLoad`
 * hooks should call. Being a createServerFn, importing it client-side only
 * pulls in a thin fetch-based stub, not the real server session code.
 */
export const getAdminSessionServerFn = createServerFn({ method: "GET" }).handler(async () => {
  return await getAdminSession();
});

/**
 * Call from a protected admin route's `beforeLoad`. Redirects to the login
 * page if there's no valid session.
 */
export async function requireAdminSession(): Promise<AdminSessionData> {
  const session = await getAdminSessionServerFn();
  if (!session) {
    throw redirect({ to: "/admin/login" });
  }
  return session;
}
