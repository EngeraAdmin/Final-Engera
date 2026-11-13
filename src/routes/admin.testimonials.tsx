import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Quote,
  Search,
  Trash2,
} from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Drawer } from "@/components/admin/Drawer";
import { ListEditor, MediaField } from "@/components/admin/fields";
import {
  AutoTextarea,
  Badge,
  Btn,
  EmptyState,
  FieldShell,
  TextInput,
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
  deleteTestimonialServerFn,
  listTestimonialsServerFn,
  reorderTestimonialsServerFn,
  saveTestimonialServerFn,
  type AdminTestimonial,
} from "@/lib/admin-testimonials";
import { listFacilitiesServerFn } from "@/lib/admin-facilities";
import { mediaUrl } from "@/lib/media-library";
import { str, type ListField, type ListItem } from "@/lib/content-schema";

export const Route = createFileRoute("/admin/testimonials")({
  beforeLoad: async () => {
    const session = await requireAdminSession();
    return { session };
  },
  loader: async () => {
    const [testimonials, facilities] = await Promise.all([
      listTestimonialsServerFn(),
      listFacilitiesServerFn(),
    ]);
    return { testimonials, facilities: facilities.map((f) => ({ slug: f.slug, name: f.name })) };
  },
  component: TestimonialsPage,
});

interface Form {
  id?: number;
  quote: string;
  name: string;
  title: string;
  facility_slug: string;
  photo: string;
  photos: ListItem[];
  source: string;
  show_on_impact: boolean;
}

const emptyForm: Form = {
  quote: "",
  name: "",
  title: "",
  facility_slug: "",
  photo: "",
  photos: [],
  source: "",
  show_on_impact: true,
};

const ALBUM_FIELD: ListField = {
  key: "photos",
  label: "Photo album",
  type: "list",
  itemLabel: "photo",
  titleKey: "alt",
  thumbKey: "src",
  default: [],
  fields: [
    { key: "src", label: "Photo", type: "image" },
    { key: "alt", label: "Description", type: "text" },
  ],
};

function TestimonialsPage() {
  const router = useRouter();
  const { testimonials: loaded, facilities } = Route.useLoaderData();
  const [order, setOrder] = useState<AdminTestimonial[] | null>(null);
  const testimonials = order ?? loaded;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTestimonial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);

  const dirty = open && JSON.stringify(form) !== initial;
  useUnsavedWarning(dirty);

  const facilityName = (slug: string) => facilities.find((f) => f.slug === slug)?.name;
  const shown = useMemo(
    () =>
      testimonials.filter(
        (t) =>
          !query || `${t.name} ${t.title} ${t.quote}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [testimonials, query],
  );

  function openForm(next: Form) {
    setForm(next);
    setInitial(JSON.stringify(next));
    setError(null);
    setOpen(true);
  }

  function openEdit(t: AdminTestimonial) {
    openForm({
      id: t.id,
      quote: t.quote,
      name: t.name,
      title: t.title,
      facility_slug: t.facility_slug,
      photo: t.photo,
      photos: t.photos.map((p) => ({ src: p.src, alt: p.alt })),
      source: t.source,
      show_on_impact: t.show_on_impact,
    });
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function closeDrawer(next: boolean) {
    if (!next && dirty && !window.confirm("Close without saving your changes?")) return;
    setOpen(next);
  }

  async function save(data: Form) {
    return saveTestimonialServerFn({
      data: {
        ...(data.id ? { id: data.id } : {}),
        quote: data.quote,
        name: data.name,
        title: data.title,
        facility_slug: data.facility_slug,
        photo: data.photo,
        photos: data.photos.map((p) => ({ src: str(p["src"]), alt: str(p["alt"]) })),
        source: data.source,
        show_on_impact: data.show_on_impact,
      },
    });
  }

  async function handleSave() {
    setError(null);
    if (!form.quote.trim() || !form.name.trim()) {
      setError("The quote and the person's name are both needed.");
      return;
    }
    setSaving(true);
    try {
      await save(form);
      setInitial(JSON.stringify(form));
      setOpen(false);
      setOrder(null);
      await router.invalidate();
      toast.success("Testimonial saved — it's live on the website.");
    } catch {
      setError("Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleImpact(t: AdminTestimonial) {
    await save({
      id: t.id,
      quote: t.quote,
      name: t.name,
      title: t.title,
      facility_slug: t.facility_slug,
      photo: t.photo,
      photos: t.photos.map((p) => ({ src: p.src, alt: p.alt })),
      source: t.source,
      show_on_impact: !t.show_on_impact,
    });
    setOrder(null);
    await router.invalidate();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTestimonialServerFn({ data: { id: deleteTarget.id } });
      setDeleteTarget(null);
      setOrder(null);
      await router.invalidate();
      toast.success("Testimonial deleted.");
    } finally {
      setDeleting(false);
    }
  }

  async function dropOn(target: AdminTestimonial) {
    if (dragId === null || dragId === target.id) return;
    const list = [...testimonials];
    const from = list.findIndex((t) => t.id === dragId);
    const to = list.findIndex((t) => t.id === target.id);
    const [moved] = list.splice(from, 1);
    if (!moved) return;
    list.splice(to, 0, moved);
    setOrder(list);
    setDragId(null);
    try {
      await reorderTestimonialsServerFn({ data: { ids: list.map((t) => t.id) } });
      await router.invalidate();
      setOrder(null);
      toast.success("New order saved.");
    } catch {
      setOrder(null);
      toast.error("Couldn't save the new order.");
    }
  }

  return (
    <AdminShell
      title="Testimonials"
      breadcrumb="Quotes on the Impact page (“Voices”) and on each facility's page"
      actions={
        <Btn variant="primary" onClick={() => openForm(emptyForm)}>
          <Plus className="size-4" /> Add testimonial
        </Btn>
      }
    >
      {testimonials.length === 0 ? (
        <EmptyState
          icon={<Quote className="size-5" />}
          title="No testimonials in the database"
          action={
            <Btn variant="primary" onClick={() => openForm(emptyForm)}>
              <Plus className="size-4" /> Add testimonial
            </Btn>
          }
        >
          The website is showing its built-in quotes for now.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a3adbd]" />
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search quotes"
                className="pl-9"
              />
            </div>
            <p className="text-[13px] text-[#7b879b]">Drag to change the order</p>
          </div>
          <div className="flex flex-col gap-3">
            {shown.map((t) => {
              const thumb = mediaUrl(t.photo) || mediaUrl(t.photos[0]?.src);
              return (
                <article
                  key={t.id}
                  draggable={!query}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => dragId !== null && e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void dropOn(t);
                  }}
                  className={cn(
                    "group flex items-start gap-4 rounded-xl border border-[#e3e7ed] bg-white p-4 transition-shadow hover:shadow-md",
                    dragId === t.id && "opacity-40",
                  )}
                >
                  {!query && (
                    <GripVertical className="mt-1 size-4 shrink-0 cursor-grab text-[#c0c8d4] group-hover:text-[#7b879b]" />
                  )}
                  <button
                    onClick={() => openEdit(t)}
                    className="admin-checker size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center bg-[#eef1f5] text-[#a3adbd]">
                        <Quote className="size-6" />
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <p className="line-clamp-2 text-[14px] leading-relaxed text-[#1e2635]">
                      “{t.quote}”
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-[#1e2635]">
                      {t.name}
                      {t.title && <span className="font-normal text-[#7b879b]"> · {t.title}</span>}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.show_on_impact ? (
                        <Badge tone="green">On Impact page</Badge>
                      ) : (
                        <Badge>Not on Impact page</Badge>
                      )}
                      {t.facility_slug && (
                        <Badge tone="blue">
                          <Building2 className="size-3" />
                          {facilityName(t.facility_slug) ?? t.facility_slug}
                        </Badge>
                      )}
                    </div>
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
                      <DropdownMenuItem onSelect={() => openEdit(t)}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void toggleImpact(t)}>
                        <Quote className="size-4" />{" "}
                        {t.show_on_impact ? "Remove from Impact page" : "Show on Impact page"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setDeleteTarget(t)}
                        className="text-[#e5484d] focus:text-[#e5484d]"
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </article>
              );
            })}
          </div>
        </>
      )}

      <Drawer
        open={open}
        onOpenChange={closeDrawer}
        title={form.id ? `Testimonial from ${form.name || "…"}` : "New testimonial"}
        footer={
          <>
            {error ? (
              <p className="mr-auto text-sm text-[#e5484d]">{error}</p>
            ) : (
              <span className="mr-auto" />
            )}
            <Btn onClick={() => closeDrawer(false)}>Cancel</Btn>
            <Btn variant="primary" loading={saving} onClick={handleSave}>
              {form.id ? "Save & publish" : "Add testimonial"}
            </Btn>
          </>
        }
      >
        <div className="flex flex-col gap-5 p-6">
          <FieldShell label="Quote" htmlFor="t-quote">
            <AutoTextarea
              id="t-quote"
              minRows={5}
              value={form.quote}
              onChange={(e) => set("quote", e.target.value)}
            />
          </FieldShell>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Name" htmlFor="t-name">
              <TextInput
                id="t-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </FieldShell>
            <FieldShell label="Role" htmlFor="t-title">
              <TextInput
                id="t-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Clinical Nurse"
              />
            </FieldShell>
          </div>
          <FieldShell
            label="Facility"
            help="The quote also appears on that facility's page."
            htmlFor="t-facility"
          >
            <select
              id="t-facility"
              value={form.facility_slug}
              onChange={(e) => set("facility_slug", e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-[#d5dbe3] bg-white px-3 text-sm focus:border-[#116dff] focus:outline-none"
            >
              <option value="">— Not linked to a facility —</option>
              {facilities.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
          </FieldShell>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e3e7ed] p-4">
            <Switch
              checked={form.show_on_impact}
              onCheckedChange={(v) => set("show_on_impact", v)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium">Show on the Impact page</span>
              <span className="block text-xs text-[#7b879b]">In the “Voices” section.</span>
            </span>
          </label>
          <FieldShell
            label="Photo"
            help="One photo under the quote. If an album is added below, the album is shown instead."
          >
            <MediaField value={form.photo} onChange={(v) => set("photo", v)} />
          </FieldShell>
          <FieldShell label="Photo album (optional)" help="Several photos that cross-fade.">
            <ListEditor
              field={ALBUM_FIELD}
              items={form.photos}
              onChange={(v) => set("photos", v)}
            />
          </FieldShell>
          <FieldShell
            label="Source (optional)"
            help="Shown in small print, e.g. the video the quote comes from."
            htmlFor="t-source"
          >
            <TextInput
              id="t-source"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            />
          </FieldShell>
        </div>
      </Drawer>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              The quote from {deleteTarget?.name} will be removed from the website. This can't be
              undone.
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
