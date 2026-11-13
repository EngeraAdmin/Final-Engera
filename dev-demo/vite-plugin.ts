/**
 * Demo-mode helpers for the local dev server (`vite dev`). See src/dev/demo-backend.ts.
 *
 *  - opens your browser on the admin page when the dev server starts
 *    (set NO_OPEN=1 to skip that),
 *  - serves practice-mode photo uploads from .dev-data/uploads at /dev-uploads,
 *  - prints the demo login in the terminal,
 *  - and — the safety net — in any production build, swaps the whole demo backend
 *    for an empty stub so none of it can ever ship with the real website.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import type { Plugin } from "vite";

const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

const STUB_ID = "\0engera-demo-stub";

export function demoMode(): Plugin[] {
  const uploadsDir = join(process.cwd(), ".dev-data", "uploads");

  return [
    {
      name: "engera-demo-dev",
      apply: "serve",
      config() {
        return process.env["NO_OPEN"] ? {} : { server: { open: "/admin" } };
      },
      configureServer(server) {
        server.middlewares.use("/dev-uploads", (req, res, next) => {
          const requested = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
          const file = normalize(join(uploadsDir, requested));
          if (!file.startsWith(uploadsDir + sep) || !existsSync(file) || !statSync(file).isFile()) {
            next();
            return;
          }
          res.setHeader(
            "Content-Type",
            IMAGE_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
          );
          res.setHeader("Cache-Control", "no-cache");
          createReadStream(file).pipe(res);
        });

        const printUrls = server.printUrls.bind(server);
        server.printUrls = () => {
          printUrls();
          const base = server.resolvedUrls?.local[0] ?? "http://localhost:8080/";
          console.log("\n  DEMO MODE — practice copy, nothing here touches the real website");
          console.log(`  Admin page : ${base}admin`);
          console.log("  Login      : username admin   password admin123 (pre-filled)");
          console.log("  Start over : stop the server, delete the .dev-data folder, start again\n");
        };
      },
    },
    {
      // Production builds can never contain the demo backend or its login.
      name: "engera-demo-strip-from-builds",
      apply: "build",
      enforce: "pre",
      resolveId(source) {
        if (/(^|[\\/])(src[\\/]dev|@[\\/]dev)[\\/]demo-backend(\.ts)?$/.test(source))
          return STUB_ID;
        return null;
      },
      load(id) {
        if (id !== STUB_ID) return null;
        return [
          "export const DEMO_USERNAME = '';",
          "export const DEMO_PASSWORD = '';",
          "export const getDemoEnv = () => null;",
        ].join("\n");
      },
    },
  ];
}
