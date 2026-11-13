import { useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MousePointerClick,
  Quote,
  Settings,
  UserRound,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { logoutServerFn } from "@/lib/admin-auth";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useAdminMode } from "@/components/admin/ui";

export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/pages", label: "Edit website", icon: MousePointerClick, highlight: true },
  { to: "/admin/facilities", label: "Facilities", icon: Building2 },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/media", label: "Media library", icon: ImageIcon },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/account", label: "Admins & password", icon: UserRound },
] as const;

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "") || "/";
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutServerFn();
    await router.navigate({ to: "/admin/login" });
  }

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/admin"
        onClick={onNavigate}
        className="flex flex-col items-start gap-1.5 px-5 pb-6 pt-5"
      >
        <BrandLogo className="[&_img]:h-7" light />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
          Website admin
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Admin">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors",
                active
                  ? "bg-white/12 font-medium text-white"
                  : "text-white/70 hover:bg-white/6 hover:text-white",
              )}
            >
              <Icon
                className={cn("size-[18px]", "highlight" in item && !active && "text-[#7fb0ff]")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-0.5 border-t border-white/10 px-3 py-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-white/70 transition-colors hover:bg-white/6 hover:text-white"
        >
          <ExternalLink className="size-[18px]" />
          View live website
        </a>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-white/70 transition-colors hover:bg-white/6 hover:text-white disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <LogOut className="size-[18px]" />
          )}
          Log out
        </button>
      </div>
    </div>
  );
}

export function AdminShell({
  title,
  breadcrumb,
  description,
  actions,
  children,
  wide = false,
}: {
  title: string;
  breadcrumb?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useAdminMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-ui min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen bg-[#162236] lg:block">
        <SideNav />
      </aside>

      {/* Phone / tablet menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[270px] bg-[#162236] shadow-xl">
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-white/70 hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
            <SideNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#e3e7ed] bg-white/95 backdrop-blur">
          <div
            className={cn(
              "mx-auto flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 sm:px-8",
              !wide && "max-w-[1180px]",
            )}
          >
            <button
              aria-label="Open menu"
              className="-ml-1 rounded-md p-2 text-[#3b4658] hover:bg-[#eef1f5] lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              {breadcrumb && <p className="text-xs text-[#7b879b]">{breadcrumb}</p>}
              <h1 className="truncate text-lg font-semibold text-[#1e2635]">{title}</h1>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </header>
        <main
          className={cn(
            "mx-auto w-full flex-1 px-4 py-6 sm:px-8 sm:py-8",
            !wide && "max-w-[1180px]",
          )}
        >
          {description && (
            <div className="mb-6 max-w-3xl text-sm text-[#5b677b]">{description}</div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
