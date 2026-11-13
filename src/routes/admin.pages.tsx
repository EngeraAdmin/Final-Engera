import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Loader2,
  Monitor,
  MousePointerClick,
  PanelsTopLeft,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAllPageContentServerFn, savePageContentServerFn } from "@/lib/page-content";
import { getSiteDataServerFn } from "@/lib/site-data";
import {
  HIDE_PREFIX,
  PAGES,
  defaultsFor,
  getPageSchema,
  type PageSchema,
  type Section,
} from "@/lib/content-schema";
import {
  ADMIN_SOURCE,
  PREVIEW_SOURCE,
  PREVIEW_WINDOW_NAME,
  type AdminToPreview,
  type Drafts,
  type PreviewToAdmin,
} from "@/lib/preview";
import { SchemaField } from "@/components/admin/fields";
import { Badge, Btn, useAdminMode, useUnsavedWarning } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/pages")({
  beforeLoad: async () => {
    const session = await requireAdminSession();
    return { session };
  },
  loader: async () => {
    const [{ overrides }, site] = await Promise.all([
      getAllPageContentServerFn(),
      getSiteDataServerFn(),
    ]);
    return { overrides, facilitySlug: site.facilities[0]?.slug ?? null };
  },
  component: SiteEditor,
});

type AllValues = Record<string, Record<string, string>>;
type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 820, mobile: 390 };

function buildBase(overrides: Record<string, Record<string, string>>): AllValues {
  return Object.fromEntries(
    PAGES.map((p) => [p.key, { ...defaultsFor(p.key), ...overrides[p.key] }]),
  );
}

const norm = (v: string | undefined) => (v === undefined || v === "false" ? "" : v);

function changedKeys(values: AllValues, base: AllValues): { page: string; key: string }[] {
  const out: { page: string; key: string }[] = [];
  for (const p of PAGES) {
    const a = values[p.key] ?? {};
    const b = base[p.key] ?? {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (norm(a[key]) !== norm(b[key])) out.push({ page: p.key, key });
    }
  }
  return out;
}

const PAGE_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Pages", keys: ["home", "about", "impact", "projects", "get-involved", "contact"] },
  { label: "Shared across pages", keys: ["global", "facility"] },
];

function SiteEditor() {
  useAdminMode();
  const loaded = Route.useLoaderData();
  const navigate = useNavigate();

  const [saved, setSaved] = useState(loaded.overrides);
  const base = useMemo(() => buildBase(saved), [saved]);
  const [values, setValues] = useState<AllValues>(() => buildBase(loaded.overrides));
  const [pageKey, setPageKey] = useState<string>("home");
  const [selected, setSelected] = useState<string | null>(null); // section id on pageKey
  const [previewPath, setPreviewPath] = useState("/");
  const [device, setDevice] = useState<Device>("desktop");
  const [publishing, setPublishing] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [frameReady, setFrameReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const history = useRef<{
    past: AllValues[];
    future: AllValues[];
    lastKey: string;
    lastAt: number;
  }>({
    past: [],
    future: [],
    lastKey: "",
    lastAt: 0,
  });
  const [, forceRender] = useState(0);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const schema = getPageSchema(pageKey) as PageSchema;
  const changes = useMemo(() => changedKeys(values, base), [values, base]);
  const dirty = changes.length > 0;
  const dirtyPages = useMemo(() => new Set(changes.map((c) => c.page)), [changes]);
  useUnsavedWarning(dirty);

  const pathFor = useCallback(
    (key: string) => {
      if (key === "facility")
        return loaded.facilitySlug ? `/projects/${loaded.facilitySlug}` : "/projects";
      return getPageSchema(key)?.path ?? "/";
    },
    [loaded.facilitySlug],
  );

  // Open the page/section named in the address (?page=about&section=team), if any.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("page");
    if (p && getPageSchema(p)) {
      setPageKey(p);
      setPreviewPath(pathFor(p));
      const s = params.get("section");
      if (s) setSelected(s);
    }
  }, [pathFor]);

  // ---- talking to the preview frame ---------------------------------------
  const post = useCallback((message: AdminToPreview) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    if (!frameReady) return;
    const id = requestAnimationFrame(() =>
      post({ source: ADMIN_SOURCE, type: "drafts", drafts: values as Drafts }),
    );
    return () => cancelAnimationFrame(id);
  }, [values, frameReady, post]);

  useEffect(() => {
    if (!frameReady) return;
    // Small delay so a device switch has re-laid out the page before scrolling.
    const id = window.setTimeout(
      () =>
        post({
          source: ADMIN_SOURCE,
          type: "select",
          section: selected ? `${pageKey}:${selected}` : null,
          scroll: true,
        }),
      120,
    );
    return () => window.clearTimeout(id);
  }, [selected, pageKey, frameReady, post, device]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const msg = event.data as PreviewToAdmin | undefined;
      if (!msg || msg.source !== PREVIEW_SOURCE) return;
      if (msg.type === "ready") {
        setFrameReady(true);
        post({ source: ADMIN_SOURCE, type: "drafts", drafts: valuesRef.current as Drafts });
      }
      if (msg.type === "select") {
        const [page = "", section = ""] = msg.section.split(":");
        if (!getPageSchema(page)) return;
        setPageKey(page);
        setSelected(section);
        setMobileView("edit");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  // ---- editing --------------------------------------------------------------
  function commit(next: AllValues, coalesceKey: string) {
    const h = history.current;
    const now = Date.now();
    if (!(h.lastKey === coalesceKey && now - h.lastAt < 1200)) {
      h.past.push(valuesRef.current);
      if (h.past.length > 80) h.past.shift();
    }
    h.future = [];
    h.lastKey = coalesceKey;
    h.lastAt = now;
    setValues(next);
  }

  function setField(page: string, key: string, raw: string) {
    commit(
      { ...valuesRef.current, [page]: { ...valuesRef.current[page], [key]: raw } },
      `${page}:${key}`,
    );
  }

  function undo() {
    const h = history.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(valuesRef.current);
    h.lastKey = "";
    setValues(prev);
    forceRender((n) => n + 1);
  }
  function redo() {
    const h = history.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(valuesRef.current);
    h.lastKey = "";
    setValues(next);
    forceRender((n) => n + 1);
  }

  async function publish() {
    if (!dirty || publishing) return;
    setPublishing(true);
    try {
      for (const page of dirtyPages) {
        const fields: Record<string, string | null> = {};
        for (const c of changes.filter((x) => x.page === page)) {
          fields[c.key] = values[page]?.[c.key] ?? null;
        }
        const result = await savePageContentServerFn({ data: { page, fields } });
        if (!result.ok) throw new Error(result.error);
      }
      const { overrides } = await getAllPageContentServerFn();
      setSaved(overrides);
      setValues(buildBase(overrides));
      history.current = { past: [], future: [], lastKey: "", lastAt: 0 };
      toast.success("Published — your changes are live on the website.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  function discard() {
    if (!window.confirm("Throw away all changes since you last published?")) return;
    commit(base, "discard");
    history.current.lastKey = "";
  }

  // Keyboard shortcuts: Ctrl/⌘+S publish, Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z redo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        void publishRef.current();
      } else if (k === "z" && !isTyping(e)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (k === "y" && !isTyping(e)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const publishRef = useRef(publish);
  publishRef.current = publish;

  function goToPage(key: string, section: string | null = null) {
    setPageKey(key);
    setSelected(section);
    if (key !== "global") {
      const path = pathFor(key);
      if (path !== previewPath) {
        setFrameReady(false);
        setPreviewPath(path);
      }
    }
  }

  function leave(to: string) {
    if (dirty && !window.confirm("You have unpublished changes. Leave without publishing?")) return;
    void navigate({ to });
  }

  const pageValues = values[pageKey] ?? {};
  const visibleSections = schema.sections.filter((s) => !s.virtual);
  const settingsSections = schema.sections.filter((s) => s.virtual);

  return (
    <div className="admin-ui flex h-screen flex-col overflow-hidden">
      {/* ------------------------------------------------------------ top bar */}
      <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-[#e3e7ed] bg-white px-2 sm:px-3">
        <button
          onClick={() => leave("/admin")}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-[#3b4658] hover:bg-[#eef1f5]"
          title="Back to dashboard"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>
        <div className="mx-1 h-6 w-px bg-[#e3e7ed]" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-[#eef1f5]">
              {pageKey === "global" ? (
                <PanelsTopLeft className="size-4 shrink-0 text-[#116dff]" />
              ) : (
                <FileText className="size-4 shrink-0 text-[#116dff]" />
              )}
              <span className="hidden text-xs text-[#7b879b] sm:inline">Page:</span>
              <span className="truncate text-sm font-semibold text-[#1e2635]">{schema.label}</span>
              {dirtyPages.has(pageKey) && (
                <span className="size-2 shrink-0 rounded-full bg-[#f5a524]" />
              )}
              <ChevronDown className="size-4 shrink-0 text-[#7b879b]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            {PAGE_GROUPS.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-[#7b879b]">
                  {group.label}
                </DropdownMenuLabel>
                {group.keys.map((key) => {
                  const p = getPageSchema(key);
                  if (!p) return null;
                  return (
                    <DropdownMenuItem
                      key={key}
                      onSelect={() => goToPage(key)}
                      className="flex items-start gap-2.5 py-2"
                    >
                      <span className="mt-0.5 flex size-4 items-center justify-center">
                        {key === pageKey && <Check className="size-4 text-[#116dff]" />}
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-[#1e2635]">
                          {p.label}
                          {dirtyPages.has(key) && (
                            <span className="size-2 rounded-full bg-[#f5a524]" />
                          )}
                        </span>
                        <span className="block text-xs leading-snug text-[#7b879b]">
                          {p.description}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-auto hidden items-center rounded-lg bg-[#eef1f5] p-0.5 lg:flex">
          {(
            [
              ["desktop", Monitor, "Desktop"],
              ["tablet", Tablet, "Tablet"],
              ["mobile", Smartphone, "Phone"],
            ] as const
          ).map(([d, Icon, label]) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              title={`${label} view`}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                device === d
                  ? "bg-white text-[#116dff] shadow-sm"
                  : "text-[#5b677b] hover:text-[#1e2635]",
              )}
            >
              <Icon className="size-4" />
              <span className="hidden xl:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button
            onClick={undo}
            disabled={history.current.past.length === 0}
            className="cursor-pointer rounded-lg p-2 text-[#3b4658] hover:bg-[#eef1f5] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            onClick={redo}
            disabled={history.current.future.length === 0}
            className="cursor-pointer rounded-lg p-2 text-[#3b4658] hover:bg-[#eef1f5] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-4" />
          </button>
          <div className="mx-1 hidden h-6 w-px bg-[#e3e7ed] sm:block" />
          <span className="hidden px-1 text-xs text-[#7b879b] xl:inline">
            {dirty
              ? `${changes.length} unpublished change${changes.length === 1 ? "" : "s"}`
              : "Everything is published"}
          </span>
          {dirty && (
            <Btn variant="ghost" size="sm" onClick={discard} className="hidden md:inline-flex">
              Discard
            </Btn>
          )}
          <a
            href={previewPath}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-[#d5dbe3] px-3.5 py-1.5 text-[13px] font-medium text-[#1e2635] hover:border-[#116dff] hover:text-[#116dff] md:inline-flex"
            title="Open the live page in a new tab"
          >
            <ExternalLink className="size-3.5" /> Live site
          </a>
          <Btn
            variant="primary"
            size="sm"
            onClick={publish}
            loading={publishing}
            disabled={!dirty}
            className="ml-1"
          >
            {!publishing && <Globe className="size-3.5" />}
            Publish
          </Btn>
        </div>
      </header>

      {/* Phone/tablet: switch between editing and previewing */}
      <div className="flex shrink-0 border-b border-[#e3e7ed] bg-white lg:hidden">
        {(["edit", "preview"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            className={cn(
              "flex-1 cursor-pointer border-b-2 py-2.5 text-sm font-medium",
              mobileView === v
                ? "border-[#116dff] text-[#116dff]"
                : "border-transparent text-[#5b677b]",
            )}
          >
            {v === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ------------------------------------------------------- inspector */}
        <aside
          className={cn(
            "admin-scroll w-full shrink-0 overflow-y-auto border-r border-[#e3e7ed] bg-white lg:block lg:w-[400px]",
            mobileView === "edit" ? "block" : "hidden",
          )}
        >
          <div className="border-b border-[#eef1f5] px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1e2635]">{schema.label}</h2>
              {pageKey === "global" && <Badge tone="blue">On every page</Badge>}
            </div>
            <p className="mt-0.5 text-[13px] text-[#69758a]">{schema.description}</p>
            <p className="mt-3 hidden items-center gap-1.5 rounded-lg bg-[#f0f6ff] px-3 py-2 text-xs text-[#0b5ad6] lg:flex">
              <MousePointerClick className="size-4 shrink-0" />
              Tip: click any part of the preview to edit it.
            </p>
          </div>

          <SectionGroup
            title="Sections on this page"
            sections={visibleSections}
            pageKey={pageKey}
            values={pageValues}
            base={base[pageKey] ?? {}}
            selected={selected}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
            onChange={(key, raw) => setField(pageKey, key, raw)}
            onGo={(link) =>
              link.route ? leave(link.route) : goToPage(link.page ?? pageKey, link.section ?? null)
            }
          />
          {settingsSections.length > 0 && (
            <SectionGroup
              title={pageKey === "global" ? "Shared settings" : "Page settings"}
              sections={settingsSections}
              pageKey={pageKey}
              values={pageValues}
              base={base[pageKey] ?? {}}
              selected={selected}
              onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
              onChange={(key, raw) => setField(pageKey, key, raw)}
              onGo={(link) =>
                link.route
                  ? leave(link.route)
                  : goToPage(link.page ?? pageKey, link.section ?? null)
              }
            />
          )}
          {pageKey !== "global" && (
            <div className="px-5 pb-8 pt-2">
              <button
                onClick={() => goToPage("global")}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#e3e7ed] p-3.5 text-left hover:border-[#116dff]"
              >
                <PanelsTopLeft className="size-5 text-[#116dff]" />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-[#1e2635]">
                    Header, footer & key figures
                  </span>
                  <span className="block text-xs text-[#7b879b]">
                    Menu, footer, donate banner, numbers
                  </span>
                </span>
                <ArrowRight className="size-4 text-[#7b879b]" />
              </button>
            </div>
          )}
        </aside>

        {/* --------------------------------------------------------- preview */}
        <PreviewCanvas
          className={cn("lg:flex", mobileView === "preview" ? "flex" : "hidden")}
          path={previewPath}
          device={device}
          iframeRef={iframeRef}
          loading={!frameReady}
        />
      </div>
    </div>
  );
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

// ---------------------------------------------------------------------------

function SectionGroup({
  title,
  sections,
  pageKey,
  values,
  base,
  selected,
  onSelect,
  onChange,
  onGo,
}: {
  title: string;
  sections: Section[];
  pageKey: string;
  values: Record<string, string>;
  base: Record<string, string>;
  selected: string | null;
  onSelect: (id: string) => void;
  onChange: (key: string, raw: string) => void;
  onGo: (link: NonNullable<Section["link"]>) => void;
}) {
  return (
    <div className="px-3 pb-2 pt-4">
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a95a8]">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">
        {sections.map((section, index) => (
          <SectionCard
            key={`${pageKey}:${section.id}`}
            index={index}
            section={section}
            values={values}
            base={base}
            open={selected === section.id}
            onToggle={() => onSelect(section.id)}
            onChange={onChange}
            onGo={onGo}
          />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  index,
  section,
  values,
  base,
  open,
  onToggle,
  onChange,
  onGo,
}: {
  index: number;
  section: Section;
  values: Record<string, string>;
  base: Record<string, string>;
  open: boolean;
  onToggle: () => void;
  onChange: (key: string, raw: string) => void;
  onGo: (link: NonNullable<Section["link"]>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hiddenKey = HIDE_PREFIX + section.id;
  const hidden = values[hiddenKey] === "true";
  const keys = [...section.fields.map((f) => f.key), hiddenKey];
  const edited = keys.some((k) => norm(values[k]) !== norm(base[k]));

  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  return (
    <div
      ref={ref}
      className={cn(
        "scroll-mt-3 rounded-xl border transition-colors",
        open
          ? "border-[#116dff] bg-white shadow-[0_0_0_3px_rgba(17,109,255,0.12)]"
          : "border-transparent hover:bg-[#f5f7fa]",
      )}
    >
      <div className="flex items-center gap-1 pr-2">
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-3 text-left"
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
              open ? "bg-[#116dff] text-white" : "bg-[#eef1f5] text-[#5b677b]",
            )}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm font-medium",
                hidden ? "text-[#9aa5b6] line-through" : "text-[#1e2635]",
              )}
            >
              {section.label}
            </span>
          </span>
          {edited && (
            <span
              className="size-2 shrink-0 rounded-full bg-[#f5a524]"
              title="Unpublished changes"
            />
          )}
          {hidden && <Badge>Hidden</Badge>}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-[#7b879b] transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {section.hideable && (
          <button
            onClick={() => onChange(hiddenKey, hidden ? "false" : "true")}
            className="cursor-pointer rounded-md p-1.5 text-[#7b879b] hover:bg-[#eef1f5] hover:text-[#1e2635]"
            title={hidden ? "Show this section on the website" : "Hide this section on the website"}
          >
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-5 border-t border-[#eef1f5] px-4 pb-5 pt-4">
          {section.description && (
            <p className="text-[13px] leading-relaxed text-[#69758a]">{section.description}</p>
          )}
          {section.link && (
            <button
              onClick={() => section.link && onGo(section.link)}
              className="flex cursor-pointer items-center gap-1.5 self-start rounded-full bg-[#e7f0ff] px-3.5 py-1.5 text-[13px] font-medium text-[#0b5ad6] hover:bg-[#d6e6ff]"
            >
              {section.link.label} <ArrowRight className="size-3.5" />
            </button>
          )}
          {hidden && (
            <p className="rounded-lg bg-[#fff6e5] px-3 py-2 text-xs text-[#94600a]">
              This section is hidden on the website. Click the eye icon to show it again.
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {section.fields.map((field) => (
              <div
                key={field.key}
                className={
                  field.type !== "list" && "half" in field && field.half
                    ? "col-span-1"
                    : "col-span-2"
                }
              >
                <SchemaField
                  field={field}
                  raw={values[field.key] ?? ""}
                  onChange={(raw) => onChange(field.key, raw)}
                  pageValues={values}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PreviewCanvas({
  path,
  device,
  iframeRef,
  loading,
  className,
}: {
  path: string;
  device: Device;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  loading: boolean;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = DEVICE_WIDTH[device];
  const pad = 24;
  const scale = size.w ? Math.min(1, (size.w - pad * 2) / width) : 1;
  const frameHeight = Math.max(200, (size.h - pad * 2) / scale);

  return (
    <div
      ref={boxRef}
      className={cn("relative min-w-0 flex-1 overflow-hidden bg-[#e9edf2]", className)}
    >
      <div className="absolute inset-0 flex justify-center" style={{ padding: pad }}>
        <div
          className={cn(
            "relative overflow-hidden bg-white shadow-[0_10px_40px_-12px_rgba(16,24,40,0.35)]",
            device === "desktop" ? "rounded-md" : "rounded-[22px] ring-8 ring-[#1e2635]",
          )}
          style={{ width: width * scale, height: frameHeight * scale }}
        >
          <iframe
            ref={iframeRef}
            key={path}
            name={PREVIEW_WINDOW_NAME}
            src={path}
            title="Website preview"
            style={{
              width,
              height: frameHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              border: 0,
              display: "block",
            }}
          />
          {loading && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-6">
              <span className="flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-xs text-[#5b677b] shadow">
                <Loader2 className="size-3.5 animate-spin" /> Loading preview…
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
