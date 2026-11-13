import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  EyeOff,
  ExternalLink,
  GripVertical,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Drawer, DrawerTabs } from "@/components/admin/Drawer";
import { ListEditor, MediaField } from "@/components/admin/fields";
import {
  AutoTextarea,
  Badge,
  Btn,
  EmptyState,
  FieldShell,
  TextInput,
  formatWhen,
  slugify,
  useUnsavedWarning,
} from "@/components/admin/ui";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  deleteFacilityServerFn,
  listFacilitiesServerFn,
  reorderFacilitiesServerFn,
  saveFacilityServerFn,
  type AdminFacility,
} from "@/lib/admin-facilities";
import { mediaUrl } from "@/lib/media-library";
import { str, type ListField, type ListItem } from "@/lib/content-schema";

export const Route = createFileRoute("/admin/facilities")({
  beforeLoad: async () => {
    const session = await requireAdminSession();
    return { session };
  },
  loader: async () => listFacilitiesServerFn(),
  component: FacilitiesPage,
});

interface Form {
  id?: number;
  slug: string;
  slugTouched: boolean;
  name: string;
  region: string;
  lat: string;
  lon: string;
  short_description: string;
  location_note: string;
  description: string;
  photo: string;
  photo_alt: string;
  facts: ListItem[];
  work: ListItem[];
  hidden: boolean;
}

const emptyForm: Form = {
  slug: "",
  slugTouched: false,
  name: "",
  region: "Gurage Zone",
  lat: "",
  lon: "",
  short_description: "",
  location_note: "",
  description: "",
  photo: "",
  photo_alt: "",
  facts: [],
  work: [],
  hidden: false,
};

const FACTS_FIELD: ListField = {
  key: "facts",
  label: "Key facts",
  type: "list",
  itemLabel: "fact",
  titleKey: "label",
  default: [],
  fields: [
    { key: "label", label: "Label", type: "text", half: true, placeholder: "Catchment (2025)" },
    { key: "value", label: "Value", type: "text", half: true, placeholder: "19,000+ people" },
  ],
};

const WORK_FIELD: ListField = {
  key: "work",
  label: "Work carried out",
  type: "list",
  itemLabel: "point",
  titleKey: "text",
  default: [],
  fields: [{ key: "text", label: "Text", type: "textarea" }],
};

type Tab = "details" | "photo" | "story" | "facts" | "location";

function FacilitiesPage() {
  const router = useRouter();
  const loaded = Route.useLoaderData();
  const [order, setOrder] = useState<AdminFacility[] | null>(null);
  const facilities = order ?? loaded;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const [form, setForm] = useState<Form>(emptyForm);
  const [initial, setInitial] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFacility | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);

  const dirty = open && JSON.stringify(form) !== initial;
  useUnsavedWarning(dirty);

  const shown = useMemo(
    () =>
      facilities.filter(
        (f) =>
          !query ||
          `${f.name} ${f.region} ${f.location_note}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [facilities, query],
  );

  function openForm(next: Form) {
    setForm(next);
    setInitial(JSON.stringify(next));
    setError(null);
    setTab("details");
    setOpen(true);
  }

  function openCreate() {
    openForm(emptyForm);
  }

  function openEdit(f: AdminFacility) {
    openForm({
      id: f.id,
      slug: f.slug,
      slugTouched: true,
      name: f.name,
      region: f.region,
      lat: f.lat?.toString() ?? "",
      lon: f.lon?.toString() ?? "",
      short_description: f.short_description,
      location_note: f.location_note,
      description: f.description,
      photo: f.photo,
      photo_alt: f.photo_alt,
      facts: f.facts.map((x) => ({ label: x.label, value: x.value })),
      work: f.work.map((text) => ({ text })),
      hidden: f.hidden,
    });
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !prev.slugTouched) next.slug = slugify(String(value));
      return next;
    });
  }

  function closeDrawer(next: boolean) {
    if (!next && dirty && !window.confirm("Close without saving your changes?")) return;
    setOpen(next);
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) {
      setTab("details");
      return setError("Give the facility a name.");
    }
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    if (form.lat === "" || form.lon === "" || Number.isNaN(lat) || Number.isNaN(lon)) {
      setTab("location");
      return setError("Add the map location (latitude and longitude) so the pin can be placed.");
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setTab("details");
      return setError("The web address may only use lowercase letters, numbers and hyphens.");
    }
    setSaving(true);
    try {
      const result = await saveFacilityServerFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          slug: form.slug,
          name: form.name,
          region: form.region,
          lat,
          lon,
          short_description: form.short_description,
          location_note: form.location_note,
          description: form.description,
          photo: form.photo,
          photo_alt: form.photo_alt,
          facts: form.facts.map((f) => ({ label: str(f["label"]), value: str(f["value"]) })),
          work: form.work.map((w) => str(w["text"])),
          hidden: form.hidden,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInitial(JSON.stringify(form));
      setOpen(false);
      setOrder(null);
      await router.invalidate();
      toast.success(
        form.id ? "Facility saved — it's live on the website." : "Facility added to the website.",
      );
    } catch {
      setError("Couldn't save — please check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFacilityServerFn({ data: { id: deleteTarget.id } });
      setDeleteTarget(null);
      setOrder(null);
      await router.invalidate();
      toast.success("Facility deleted.");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleHidden(f: AdminFacility) {
    await saveFacilityServerFn({
      data: {
        id: f.id,
        slug: f.slug,
        name: f.name,
        region: f.region,
        lat: f.lat ?? 0,
        lon: f.lon ?? 0,
        short_description: f.short_description,
        location_note: f.location_note,
        description: f.description,
        photo: f.photo,
        photo_alt: f.photo_alt,
        facts: f.facts,
        work: f.work,
        hidden: !f.hidden,
      },
    });
    setOrder(null);
    await router.invalidate();
    toast.success(
      f.hidden ? `${f.name} is visible again.` : `${f.name} is now hidden from the website.`,
    );
  }

  async function dropOn(target: AdminFacility) {
    if (dragId === null || dragId === target.id) return;
    const list = [...facilities];
    const from = list.findIndex((f) => f.id === dragId);
    const to = list.findIndex((f) => f.id === target.id);
    const [moved] = list.splice(from, 1);
    if (!moved) return;
    list.splice(to, 0, moved);
    setOrder(list);
    setDragId(null);
    try {
      await reorderFacilitiesServerFn({ data: { ids: list.map((f) => f.id) } });
      await router.invalidate();
      setOrder(null);
      toast.success("New order saved.");
    } catch {
      setOrder(null);
      toast.error("Couldn't save the new order.");
    }
  }

  const coordsOk =
    form.lat !== "" &&
    form.lon !== "" &&
    !Number.isNaN(Number(form.lat)) &&
    !Number.isNaN(Number(form.lon));

  return (
    <AdminShell
      title="Facilities"
      breadcrumb="Map pins, the Projects page, each facility's own page and the footer list"
      actions={
        <>
          <a
            href="/projects"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-[#d5dbe3] bg-white px-4 py-2 text-sm font-medium hover:border-[#116dff] hover:text-[#116dff] sm:inline-flex"
          >
            <ExternalLink className="size-4" /> View map
          </a>
          <Btn variant="primary" onClick={openCreate}>
            <Plus className="size-4" /> Add facility
          </Btn>
        </>
      }
    >
      {facilities.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="No facilities in the database"
          action={
            <Btn variant="primary" onClick={openCreate}>
              <Plus className="size-4" /> Add facility
            </Btn>
          }
        >
          The website is showing its built-in list for now. Add a facility to start managing them
          here.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a3adbd]" />
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search facilities"
                className="pl-9"
              />
            </div>
            <p className="text-[13px] text-[#7b879b]">
              {facilities.length} facilities · drag cards to change the order they appear on the
              website
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((f) => (
              <article
                key={f.id}
                draggable={!query}
                onDragStart={() => setDragId(f.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => dragId !== null && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void dropOn(f);
                }}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-xl border border-[#e3e7ed] bg-white transition-shadow hover:shadow-md",
                  dragId === f.id && "opacity-40",
                  f.hidden && "opacity-70",
                )}
              >
                <button
                  onClick={() => openEdit(f)}
                  className="admin-checker relative aspect-[16/10] cursor-pointer overflow-hidden"
                >
                  {mediaUrl(f.photo) ? (
                    <img
                      src={mediaUrl(f.photo)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-[#eef1f5] text-[#9aa5b6]">
                      <Building2 className="size-8" />
                    </span>
                  )}
                  {!query && (
                    <span className="absolute left-2 top-2 rounded-md bg-white/90 p-1 text-[#5b677b] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                      <GripVertical className="size-4" />
                    </span>
                  )}
                  {f.hidden && (
                    <span className="absolute right-2 top-2">
                      <Badge tone="amber">
                        <EyeOff className="size-3" /> Hidden
                      </Badge>
                    </span>
                  )}
                </button>
                <div className="flex flex-1 items-start gap-2 p-4">
                  <button
                    onClick={() => openEdit(f)}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7b879b]">
                      {f.region || "—"}
                    </p>
                    <p className="mt-0.5 truncate font-semibold text-[#1e2635]">{f.name}</p>
                    <p className="mt-1 line-clamp-2 text-[13px] text-[#69758a]">
                      {f.short_description}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="cursor-pointer rounded-md p-1.5 text-[#7b879b] hover:bg-[#eef1f5]"
                        aria-label="More"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(f)}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/projects/${f.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-4" /> View its page
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void toggleHidden(f)}>
                        <EyeOff className="size-4" />{" "}
                        {f.hidden ? "Show on website" : "Hide from website"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setDeleteTarget(f)}
                        className="text-[#e5484d] focus:text-[#e5484d]"
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between border-t border-[#eef1f5] px-4 py-2 text-[11px] text-[#9aa5b6]">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {f.lat !== null && f.lon !== null
                      ? `${f.lat.toFixed(3)}, ${f.lon.toFixed(3)}`
                      : "No location"}
                  </span>
                  <span>Updated {formatWhen(f.updated_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <Drawer
        open={open}
        onOpenChange={closeDrawer}
        wide
        title={form.id ? form.name || "Edit facility" : "New facility"}
        subtitle={
          form.id
            ? `Its page: /projects/${form.slug}`
            : "Fill in the basics, then add a photo and location."
        }
        footer={
          <>
            {error && <p className="mr-auto text-sm text-[#e5484d]">{error}</p>}
            {!error && form.id && (
              <a
                href={`/projects/${form.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mr-auto flex items-center gap-1 text-[13px] text-[#69758a] hover:text-[#116dff]"
              >
                <ExternalLink className="size-3.5" /> View page
              </a>
            )}
            {!error && !form.id && <span className="mr-auto" />}
            <Btn onClick={() => closeDrawer(false)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={handleSave}>
              {form.id ? "Save & publish" : "Add facility"}
            </Btn>
          </>
        }
      >
        <DrawerTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "details", label: "Details" },
            { id: "photo", label: "Photo" },
            { id: "story", label: "Description" },
            { id: "facts", label: "Facts & work" },
            {
              id: "location",
              label: "Map location",
              badge: !coordsOk ? <span className="size-2 rounded-full bg-[#f5a524]" /> : undefined,
            },
          ]}
        />
        <div className="flex flex-col gap-5 p-6">
          {tab === "details" && (
            <>
              <FieldShell label="Name" htmlFor="f-name">
                <TextInput
                  id="f-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Burat Health Centre"
                />
              </FieldShell>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell label="Region" help="The small heading on cards." htmlFor="f-region">
                  <TextInput
                    id="f-region"
                    value={form.region}
                    onChange={(e) => set("region", e.target.value)}
                  />
                </FieldShell>
                <FieldShell
                  label="Location note"
                  help="e.g. Near Endibir, Gurage Zone"
                  htmlFor="f-locnote"
                >
                  <TextInput
                    id="f-locnote"
                    value={form.location_note}
                    onChange={(e) => set("location_note", e.target.value)}
                  />
                </FieldShell>
              </div>
              <FieldShell
                label="Short summary"
                help="One sentence for cards, the map and search results."
                htmlFor="f-short"
              >
                <AutoTextarea
                  id="f-short"
                  minRows={2}
                  value={form.short_description}
                  onChange={(e) => set("short_description", e.target.value)}
                />
              </FieldShell>
              <FieldShell
                label="Web address"
                help={`The page lives at /projects/${form.slug || "…"}. Changing it breaks old links to this page.`}
                htmlFor="f-slug"
              >
                <TextInput
                  id="f-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, slug: slugify(e.target.value), slugTouched: true }))
                  }
                  className="font-mono text-[13px]"
                />
              </FieldShell>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e3e7ed] p-4">
                <Switch
                  checked={!form.hidden}
                  onCheckedChange={(v) => set("hidden", !v)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">Show on the website</span>
                  <span className="block text-xs text-[#7b879b]">
                    Switch off to take it off the map and lists without deleting it.
                  </span>
                </span>
              </label>
            </>
          )}
          {tab === "photo" && (
            <>
              <div className="admin-checker aspect-[16/9] overflow-hidden rounded-xl border border-[#e3e7ed]">
                {mediaUrl(form.photo) ? (
                  <img src={mediaUrl(form.photo)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-[#7b879b]">
                    <Building2 className="size-8" />
                    No photo — the website shows a tasteful placeholder.
                  </div>
                )}
              </div>
              <MediaField value={form.photo} onChange={(v) => set("photo", v)} />
              <FieldShell
                label="Photo description"
                help="Read aloud by screen readers. Leave empty to use the facility's name."
                htmlFor="f-alt"
              >
                <TextInput
                  id="f-alt"
                  value={form.photo_alt}
                  onChange={(e) => set("photo_alt", e.target.value)}
                />
              </FieldShell>
            </>
          )}
          {tab === "story" && (
            <FieldShell
              label="Full description"
              help="Shown on the facility's own page. Leave an empty line between paragraphs."
              htmlFor="f-desc"
            >
              <AutoTextarea
                id="f-desc"
                minRows={10}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </FieldShell>
          )}
          {tab === "facts" && (
            <>
              <FieldShell
                label="Key facts"
                help="The small figures under the description (e.g. Catchment, Patients treated)."
              >
                <ListEditor
                  field={FACTS_FIELD}
                  items={form.facts}
                  onChange={(v) => set("facts", v)}
                />
              </FieldShell>
              <FieldShell label="Work carried out" help="The bullet list under “The work at …”.">
                <ListEditor field={WORK_FIELD} items={form.work} onChange={(v) => set("work", v)} />
              </FieldShell>
            </>
          )}
          {tab === "location" && (
            <>
              <p className="rounded-xl bg-[#f0f6ff] p-4 text-[13px] leading-relaxed text-[#264a85]">
                <strong>How to find the numbers:</strong> open Google Maps, right-click the
                facility's exact spot, and click the two numbers at the top of the menu to copy
                them. Then paste them in the box below.
              </p>
              <FieldShell label="Paste coordinates" help="e.g. 7.9968, 37.9202">
                <TextInput
                  placeholder="latitude, longitude"
                  onChange={(e) => {
                    const m = e.target.value.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
                    if (m) setForm((p) => ({ ...p, lat: m[1] ?? "", lon: m[2] ?? "" }));
                  }}
                />
              </FieldShell>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell label="Latitude" htmlFor="f-lat">
                  <TextInput
                    id="f-lat"
                    inputMode="decimal"
                    value={form.lat}
                    onChange={(e) => set("lat", e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Longitude" htmlFor="f-lon">
                  <TextInput
                    id="f-lon"
                    inputMode="decimal"
                    value={form.lon}
                    onChange={(e) => set("lon", e.target.value)}
                  />
                </FieldShell>
              </div>
              {coordsOk && (
                <div className="overflow-hidden rounded-xl border border-[#e3e7ed]">
                  <iframe
                    title="Location check"
                    className="h-64 w-full border-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.lon) - 0.08}%2C${Number(form.lat) - 0.05}%2C${Number(form.lon) + 0.08}%2C${Number(form.lat) + 0.05}&layer=mapnik&marker=${form.lat}%2C${form.lon}`}
                  />
                  <p className="border-t border-[#eef1f5] px-3 py-2 text-xs text-[#7b879b]">
                    Check the marker is in the right place.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Drawer>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the map, the Projects page and the footer, and its own page stops
              working. Testimonials linked to it are kept. If you only want to take it down for a
              while, choose “Hide from website” instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-[#e5484d] hover:bg-[#cf3a3f]"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
