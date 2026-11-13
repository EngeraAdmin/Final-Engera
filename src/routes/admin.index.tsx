import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MousePointerClick,
  PanelsTopLeft,
  PenLine,
  Quote,
  Settings,
  UserRound,
} from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, Panel, btnClass, formatWhen } from "@/components/admin/ui";
import { getDemoInfoServerFn, requireAdminSession } from "@/lib/admin-auth";
import { getDashboardServerFn, type Activity } from "@/lib/admin-dashboard";
import { getPageSchema, PAGES } from "@/lib/content-schema";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const session = await requireAdminSession();
    return { session };
  },
  loader: async () => {
    const [demo, dashboard] = await Promise.all([getDemoInfoServerFn(), getDashboardServerFn()]);
    return { demo, dashboard };
  },
  component: AdminDashboard,
});

const DEMO_TRY_THIS = [
  "Click “Edit website”, then click the big heading on the Home page and type — the preview changes as you type. Press Publish.",
  "Hide a section with the eye icon, or drag the “What we do” cards into a new order.",
  "Facilities — edit “Demo Community Clinic”, or add one (sample photos are in dev-demo/sample-photos).",
  "Media library — drop in a few photos, then use them anywhere on the site.",
];

function activityLabel(a: Activity): { text: string; icon: typeof FileText } {
  switch (a.kind) {
    case "page": {
      const page = getPageSchema(a.ref);
      return { text: `${page?.label ?? a.ref} page edited`, icon: FileText };
    }
    case "facility":
      return { text: `Facility “${a.ref}” updated`, icon: Building2 };
    case "testimonial":
      return { text: `Testimonial from ${a.ref} updated`, icon: Quote };
    default:
      return { text: "Site settings updated", icon: Settings };
  }
}

function AdminDashboard() {
  const { session } = Route.useRouteContext();
  const { demo, dashboard } = Route.useLoaderData();
  const pages = PAGES.filter((p) => p.key !== "global" && p.key !== "facility");

  const stats = [
    {
      label: "Facilities",
      value: dashboard.counts.facilities,
      to: "/admin/facilities" as const,
      icon: Building2,
    },
    {
      label: "Testimonials",
      value: dashboard.counts.testimonials,
      to: "/admin/testimonials" as const,
      icon: Quote,
    },
    {
      label: "Uploaded files",
      value: dashboard.counts.media,
      to: "/admin/media" as const,
      icon: ImageIcon,
    },
    {
      label: "Customised texts",
      value: dashboard.counts.edits,
      to: "/admin/pages" as const,
      icon: PenLine,
    },
  ];

  return (
    <AdminShell
      title="Dashboard"
      breadcrumb={`Signed in as ${session.email}`}
      actions={
        <>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-[#d5dbe3] bg-white px-4 py-2 text-sm font-medium hover:border-[#116dff] hover:text-[#116dff] sm:inline-flex"
          >
            <ExternalLink className="size-4" /> View website
          </a>
          <Link to="/admin/pages" className={btnClass("primary")}>
            <MousePointerClick className="size-4" /> Edit website
          </Link>
        </>
      }
    >
      {demo.demo && (
        <div className="mb-6 rounded-xl border border-[#f5d48a] bg-[#fffaeb] p-5 text-sm">
          <p className="font-semibold text-[#5c3d00]">
            Demo mode — a practice copy on your computer
          </p>
          <p className="mt-1 text-[#7a5a1a]">
            Everything you change is saved in the <code>.dev-data</code> folder and never touches
            the real website. To start over, stop the server, delete that folder, and start again.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[#7a5a1a]">
            {DEMO_TRY_THIS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Hero: the visual editor */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#116dff] to-[#0846a8] p-6 text-white sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-medium text-white/80">Website editor</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-[28px]">
            Click anything on your website to change it
          </h2>
          <p className="mt-2 text-[15px] text-white/85">
            Text, photos, videos, buttons, lists and whole sections — on every page. You see changes
            as you type, and nothing goes live until you press Publish.
          </p>
          <Link
            to="/admin/pages"
            className={btnClass(
              "secondary",
              "md",
              "mt-5 border-0 bg-white text-[#0b5ad6] hover:bg-white/90 hover:text-[#0846a8]",
            )}
          >
            Open the editor <ArrowRight className="size-4" />
          </Link>
        </div>
        <MousePointerClick className="absolute -bottom-6 -right-4 size-48 text-white/10" />
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              className="group rounded-xl border border-[#e3e7ed] bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#eef4ff] text-[#116dff]">
                  <Icon className="size-[18px]" />
                </span>
                <ArrowRight className="size-4 text-[#c0c8d4] transition-transform group-hover:translate-x-0.5 group-hover:text-[#116dff]" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-[#1e2635]">{s.value}</p>
              <p className="text-[13px] text-[#69758a]">{s.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Your pages" description="Jump straight into any page.">
          <div className="-mx-2 grid gap-1 sm:grid-cols-2">
            {pages.map((p) => (
              <a
                key={p.key}
                href={`/admin/pages?page=${p.key}`}
                className="group flex items-start gap-3 rounded-lg p-2.5 hover:bg-[#f5f7fa]"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-[#eef1f5] text-[#5b677b] group-hover:bg-[#116dff] group-hover:text-white">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#1e2635]">{p.label}</span>
                  <span className="block text-xs leading-snug text-[#7b879b]">{p.description}</span>
                </span>
              </a>
            ))}
            <a
              href="/admin/pages?page=global"
              className="group flex items-start gap-3 rounded-lg p-2.5 hover:bg-[#f5f7fa]"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-[#eef1f5] text-[#5b677b] group-hover:bg-[#116dff] group-hover:text-white">
                <PanelsTopLeft className="size-4" />
              </span>
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-[#1e2635]">
                  Header & footer <Badge tone="blue">All pages</Badge>
                </span>
                <span className="block text-xs leading-snug text-[#7b879b]">
                  Menu, footer, donate banner, key figures
                </span>
              </span>
            </a>
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Recent changes">
            {dashboard.recent.length === 0 ? (
              <p className="text-sm text-[#7b879b]">Nothing edited yet.</p>
            ) : (
              <ul className="-my-1 divide-y divide-[#eef1f5]">
                {dashboard.recent.map((a, i) => {
                  const { text, icon: Icon } = activityLabel(a);
                  return (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <Icon className="size-4 shrink-0 text-[#7b879b]" />
                      <span className="min-w-0 flex-1 truncate text-sm text-[#1e2635]">{text}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-[#9aa5b6]">
                        <Clock className="size-3" />
                        {formatWhen(a.updated_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel title="Site settings">
            <div className="-mx-2 flex flex-col">
              <Link
                to="/admin/settings"
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-[#f5f7fa]"
              >
                <Settings className="size-4 text-[#7b879b]" />
                <span className="flex-1 text-sm">
                  Donate link, contact details, social media, newsletter
                </span>
                <ArrowRight className="size-4 text-[#c0c8d4]" />
              </Link>
              <Link
                to="/admin/account"
                className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-[#f5f7fa]"
              >
                <UserRound className="size-4 text-[#7b879b]" />
                <span className="flex-1 text-sm">Change your password or add another admin</span>
                <ArrowRight className="size-4 text-[#c0c8d4]" />
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
