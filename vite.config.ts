// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Local-only demo helpers (opens the admin, serves practice uploads). In production
// builds this swaps the demo backend for an empty stub. See dev-demo/vite-plugin.ts.
import { demoMode } from "./dev-demo/vite-plugin";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: demoMode(),
    // Pre-bundle the admin's UI libraries up front, so the dev server doesn't have to stop and
    // reload the page the first time an admin screen uses them.
    optimizeDeps: {
      include: [
        "@radix-ui/react-switch",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-dialog",
      ],
    },
  },
});
