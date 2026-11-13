import { AsyncLocalStorage } from "node:async_hooks";

// Demo mode (local `vite dev` only). In every production build this import is
// swapped for an empty stub — see dev-demo/vite-plugin.ts.
import { getDemoEnv } from "@/dev/demo-backend";

/**
 * The Cloudflare bindings this app needs. Names here must exactly match the
 * `binding` values set in wrangler.toml.
 */
export interface CloudflareBindings {
  DB: D1Database;
  MEDIA: R2Bucket;
  SESSION_SECRET: string;
  /** Public base URL for the R2 bucket (its pub-*.r2.dev URL, or a custom domain). */
  R2_PUBLIC_BASE_URL?: string;
}

// A dedicated AsyncLocalStorage, separate from TanStack Start's own request
// storage — set once per request in src/server.ts (the one place that
// genuinely receives the raw Workers `env`), then readable from anywhere
// downstream in that same request's async chain, including server functions.
const GLOBAL_KEY = Symbol.for("engera:cloudflare-env-storage");
const globalObj = globalThis as unknown as Record<symbol, AsyncLocalStorage<CloudflareBindings>>;
if (!globalObj[GLOBAL_KEY]) {
  globalObj[GLOBAL_KEY] = new AsyncLocalStorage<CloudflareBindings>();
}
const storage = globalObj[GLOBAL_KEY];

/**
 * Finds the real Workers `env` for the current request. Nitro's Cloudflare
 * handler receives it but only forwards the `request` onward, attaching the
 * bindings to `request.runtime.cloudflare.env` (and `globalThis.__env__`) —
 * the extra arguments src/server.ts's fetch() is declared with never arrive.
 * Returns an empty object off Cloudflare; getCloudflareEnv() then reports a
 * clear error.
 */
export function resolveCloudflareBindings(
  request: Request,
  fallback?: unknown,
): CloudflareBindings {
  const fromRequest = (
    request as unknown as { runtime?: { cloudflare?: { env?: CloudflareBindings } } }
  ).runtime?.cloudflare?.env;
  const fromGlobal = (globalThis as unknown as { __env__?: CloudflareBindings }).__env__;
  return (
    fromRequest ??
    fromGlobal ??
    (fallback as CloudflareBindings | undefined) ??
    ({} as CloudflareBindings)
  );
}

export function runWithCloudflareEnv<T>(
  env: CloudflareBindings,
  fn: () => T | Promise<T>,
): Promise<T> {
  return Promise.resolve(storage.run(env, fn));
}

/**
 * True only when running the plain local dev server with no Cloudflare runtime —
 * i.e. when the built-in practice backend (src/dev/demo-backend.ts) is in use.
 * Always false in production builds, on `wrangler dev`, and on the live site.
 */
export function isDemoMode(): boolean {
  return import.meta.env.DEV && !storage.getStore()?.DB;
}

/**
 * Call from any server function or route loader to reach D1/R2. Throws with a
 * clear message if called outside a Cloudflare Workers request. On the plain
 * local dev server (`vite dev`) it hands back the practice backend instead, so
 * the admin works with no setup.
 */
export function getCloudflareEnv(): CloudflareBindings {
  const env = storage.getStore();
  if (env?.DB) return env;

  if (import.meta.env.DEV) {
    const demo = getDemoEnv();
    if (demo) return demo;
  }

  // Covers both "no request context at all" and "a request context exists but
  // isn't Cloudflare's" (e.g. built for Netlify instead) — outside the local
  // demo, the admin/CMS backend only runs on Cloudflare Workers.
  throw new Error(
    "Cloudflare bindings aren't available here. The admin/CMS backend only works when " +
      "running under Cloudflare Workers (wrangler dev locally, or a deployed Cloudflare " +
      "Worker) — it will not work on Netlify.",
  );
}
