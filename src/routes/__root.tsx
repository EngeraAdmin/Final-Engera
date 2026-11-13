import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { SiteLoader } from "@/components/site/SiteLoader";
import { SiteDataProvider } from "@/components/site/SiteDataContext";
import { getSiteDataServerFn } from "@/lib/site-data";
import { PreviewBridge } from "@/components/site/PreviewBridge";
import { contentOf } from "@/lib/content-schema";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 font-display text-xl text-primary">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-accent-foreground transition-colors hover:bg-accent-dark"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-primary">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary-light"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-input bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Facilities, testimonials and site-wide settings, shared by every public page.
  // Falls back to the built-in content if the admin database isn't connected.
  loader: () => getSiteDataServerFn(),
  staleTime: 30_000,
  head: ({ loaderData }) => {
    const g = contentOf("global", loaderData?.global);
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: g.t("site_title") },
        {
          name: "description",
          content: g.t("site_description"),
        },
        { name: "author", content: "Engera USA" },
        { property: "og:site_name", content: "Engera USA" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..600&family=Inter:wght@300..700&display=swap",
        },
        { rel: "icon", href: "/favicon.png", type: "image/png" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const siteData = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The admin dashboard has its own chrome (AdminShell) — the public site's
  // header/footer/loader don't belong there.
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SiteDataProvider value={siteData}>
        <SiteLoader />
        <PreviewBridge />
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1">
            {/* Required: nested routes render here. Keyed for a soft page transition. */}
            <div key={pathname} className="page-fade">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
        <Toaster />
      </SiteDataProvider>
    </QueryClientProvider>
  );
}
