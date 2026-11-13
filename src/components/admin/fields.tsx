import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  ImagePlus,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Youtube,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  serializeDefault,
  str,
  youtubeId,
  type Field,
  type ItemField,
  type ListField,
  type ListItem,
  type ScalarField,
} from "@/lib/content-schema";
import { mediaUrl } from "@/lib/media-library";
import type { MediaKind } from "@/lib/admin-media";
import { AutoTextarea, FieldShell, TextInput } from "@/components/admin/ui";
import { MediaPicker, MediaThumb } from "@/components/admin/MediaPicker";

// ---------------------------------------------------------------------------
// Photo / video / file
// ---------------------------------------------------------------------------

export function MediaField({
  value,
  onChange,
  kind = "image",
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  kind?: MediaKind;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const has = !!mediaUrl(value) && value !== "#";
  const word = kind === "image" ? "photo" : kind === "video" ? "video" : "file";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "admin-checker group relative shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[#d5dbe3] transition-colors hover:border-[#116dff]",
          compact ? "h-14 w-20" : "h-[72px] w-28",
        )}
        title={`Change ${word}`}
      >
        {has ? (
          <MediaThumb src={value} kind={kind} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#9aa5b6]">
            <ImagePlus className="size-5" />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-[#116dff]/80 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          {has ? "Change" : "Add"}
        </span>
      </button>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer text-[13px] font-medium text-[#116dff] hover:underline"
        >
          {has ? `Change ${word}` : `Add ${word}`}
        </button>
        {has && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="cursor-pointer text-xs text-[#7b879b] hover:text-[#e5484d]"
          >
            Remove
          </button>
        )}
        {has && kind !== "image" && (
          <a
            href={mediaUrl(value)}
            target="_blank"
            rel="noreferrer"
            className="max-w-[180px] truncate text-[11px] text-[#7b879b] hover:underline"
          >
            {mediaUrl(value).split("/").pop()}
          </a>
        )}
      </div>
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        kind={kind}
        value={value}
        onSelect={onChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single values
// ---------------------------------------------------------------------------

const LINK_PRESETS = [
  { label: "Donate page", value: "{donate}" },
  { label: "Email us", value: "mailto:{email}" },
  { label: "Contact page", value: "/contact" },
  { label: "Get Involved page", value: "/get-involved" },
  { label: "About page", value: "/about" },
  { label: "Impact page", value: "/impact" },
  { label: "Projects page", value: "/projects" },
];

type AnyField = ScalarField | ItemField;

function selectOptions(field: AnyField, pageValues?: Record<string, string>) {
  if (field.options) return field.options;
  if ("optionsFrom" in field && field.optionsFrom && pageValues) {
    const { list, value, label } = field.optionsFrom;
    try {
      const items = JSON.parse(pageValues[list] ?? "[]") as ListItem[];
      return items.map((i) => ({ value: str(i[value]), label: str(i[label]) || str(i[value]) }));
    } catch {
      return [];
    }
  }
  return [];
}

export function ValueInput({
  field,
  value,
  onChange,
  id,
  pageValues,
}: {
  field: AnyField;
  value: unknown;
  onChange: (value: unknown) => void;
  id?: string;
  pageValues?: Record<string, string>;
}) {
  const s = str(value);
  switch (field.type) {
    case "textarea":
      return (
        <AutoTextarea
          id={id}
          value={s}
          minRows={field.rows ?? 3}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "lines":
      return (
        <AutoTextarea
          id={id}
          value={Array.isArray(value) ? value.map(str).join("\n") : s}
          minRows={3}
          placeholder="One per line"
          onChange={(e) => onChange(e.target.value.split("\n"))}
        />
      );
    case "image":
      return <MediaField value={s} onChange={onChange} kind="image" />;
    case "video":
      return <MediaField value={s} onChange={onChange} kind="video" />;
    case "file":
      return <MediaField value={s} onChange={onChange} kind="file" />;
    case "number":
      return (
        <TextInput
          id={id}
          type="number"
          inputMode="numeric"
          value={s}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "toggle":
      return (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-[#3b4658]">
          <Switch
            checked={value === true || value === "true"}
            onCheckedChange={(v) => onChange(v)}
          />
          {value === true || value === "true" ? "On" : "Off"}
        </label>
      );
    case "select": {
      const options = selectOptions(field, pageValues);
      return (
        <select
          id={id}
          value={s}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-[#d5dbe3] bg-white px-3 text-sm text-[#1e2635] focus:border-[#116dff] focus:outline-none focus:ring-3 focus:ring-[#116dff]/15"
        >
          {!options.some((o) => o.value === s) && <option value={s}>{s || "— Choose —"}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    case "youtube": {
      const vid = youtubeId(s);
      return (
        <div className="flex flex-col gap-2">
          <TextInput
            id={id}
            value={s}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => onChange(e.target.value)}
          />
          {vid && (
            <div className="flex items-center gap-3">
              <img
                src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                alt=""
                className="h-14 w-24 rounded-md border border-[#e3e7ed] object-cover"
              />
              <span className="flex items-center gap-1 text-xs text-[#7b879b]">
                <Youtube className="size-4 text-[#e5484d]" /> Video ID: {vid}
              </span>
            </div>
          )}
        </div>
      );
    }
    case "url":
      return (
        <div className="flex gap-2">
          <TextInput
            id={id}
            value={s}
            placeholder={field.placeholder ?? "https://…"}
            onChange={(e) => onChange(e.target.value)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#d5dbe3] bg-white px-2.5 text-xs text-[#3b4658] hover:border-[#116dff]"
                title="Pick a common link"
              >
                Quick <ChevronDown className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LINK_PRESETS.map((p) => (
                <DropdownMenuItem key={p.value} onSelect={() => onChange(p.value)}>
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    default:
      return (
        <TextInput
          id={id}
          value={s}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Lists (cards, timeline entries, people, tabs…)
// ---------------------------------------------------------------------------

function emptyItem(field: ListField): ListItem {
  const item: ListItem = {};
  for (const f of field.fields) {
    if (f.type === "lines") item[f.key] = [];
    else if (f.type === "toggle") item[f.key] = false;
    else if (f.type === "number") item[f.key] = 0;
    else if (f.type === "select") item[f.key] = f.options?.[0]?.value ?? "";
    else item[f.key] = "";
  }
  return item;
}

export function ListEditor({
  field,
  items,
  onChange,
  pageValues,
}: {
  field: ListField;
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  pageValues?: Record<string, string>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function update(index: number, key: string, value: unknown) {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    onChange(next);
    if (openIndex === from) setOpenIndex(to);
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setOpenIndex(null);
  }
  function duplicate(index: number) {
    const copy = items[index];
    if (!copy) return;
    const next = [...items];
    next.splice(index + 1, 0, structuredClone(copy));
    onChange(next);
    setOpenIndex(index + 1);
  }
  function add() {
    onChange([...items, emptyItem(field)]);
    setOpenIndex(items.length);
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => {
        const open = openIndex === index;
        const title = str(item[field.titleKey]) || `Untitled ${field.itemLabel}`;
        const thumb = field.thumbKey ? str(item[field.thumbKey]) : "";
        return (
          <div
            key={index}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cn(
              "rounded-lg border bg-white transition-shadow",
              open ? "border-[#9ec2ff] shadow-sm" : "border-[#e3e7ed]",
              overIndex === index &&
                dragIndex !== null &&
                dragIndex !== index &&
                "ring-2 ring-[#116dff]",
              dragIndex === index && "opacity-50",
            )}
          >
            <div className="flex items-center gap-1 py-1.5 pl-1 pr-1.5">
              <span
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className="cursor-grab rounded p-1 text-[#a3adbd] hover:bg-[#eef1f5] hover:text-[#3b4658] active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="size-4" />
              </span>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-1 text-left"
              >
                {field.thumbKey && (
                  <span className="admin-checker size-8 shrink-0 overflow-hidden rounded">
                    {mediaUrl(thumb) ? (
                      <img src={mediaUrl(thumb)} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#1e2635]">
                  {title}
                </span>
                {open ? (
                  <ChevronDown className="size-4 shrink-0 text-[#7b879b]" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-[#7b879b]" />
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer rounded p-1.5 text-[#7b879b] hover:bg-[#eef1f5] hover:text-[#1e2635]"
                    aria-label="More"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={index === 0} onSelect={() => move(index, index - 1)}>
                    <ArrowUp className="size-4" /> Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === items.length - 1}
                    onSelect={() => move(index, index + 1)}
                  >
                    <ArrowDown className="size-4" /> Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => duplicate(index)}>
                    <Copy className="size-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => remove(index)}
                    className="text-[#e5484d] focus:text-[#e5484d]"
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {open && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 border-t border-[#eef1f5] px-3.5 pb-4 pt-3.5">
                {field.fields.map((f) => (
                  <FieldShell
                    key={f.key}
                    label={f.label}
                    help={f.help}
                    htmlFor={`item-${index}-${f.key}`}
                    className={f.half ? "col-span-1" : "col-span-2"}
                  >
                    <ValueInput
                      id={`item-${index}-${f.key}`}
                      field={f}
                      value={item[f.key]}
                      onChange={(v) => update(index, f.key, v)}
                      {...(pageValues ? { pageValues } : {})}
                    />
                  </FieldShell>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#b9c9e6] py-2.5 text-[13px] font-medium text-[#116dff] transition-colors hover:border-[#116dff] hover:bg-[#f0f6ff]"
      >
        <Plus className="size-4" /> Add {field.itemLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A schema field, with its label and "reset to original"
// ---------------------------------------------------------------------------

function parseList(raw: string, field: ListField): ListItem[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as ListItem[]) : field.default;
  } catch {
    return field.default;
  }
}

export function SchemaField({
  field,
  raw,
  onChange,
  pageValues,
}: {
  field: Field;
  raw: string;
  onChange: (raw: string) => void;
  pageValues: Record<string, string>;
}) {
  const changed = raw !== serializeDefault(field);
  const reset = changed ? (
    <button
      type="button"
      onClick={() => onChange(serializeDefault(field))}
      className="flex cursor-pointer items-center gap-1 text-[11px] text-[#7b879b] hover:text-[#116dff]"
      title="Go back to the original"
    >
      <RotateCcw className="size-3" /> Reset
    </button>
  ) : null;
  const id = `field-${field.key}`;

  if (field.type === "list") {
    return (
      <FieldShell label={field.label} help={field.help} aside={reset}>
        <ListEditor
          field={field}
          items={parseList(raw, field)}
          onChange={(items) => onChange(JSON.stringify(items))}
          pageValues={pageValues}
        />
      </FieldShell>
    );
  }
  return (
    <FieldShell label={field.label} help={field.help} aside={reset} htmlFor={id}>
      <ValueInput
        id={id}
        field={field}
        value={raw}
        onChange={(v) => onChange(typeof v === "string" ? v : str(v))}
        pageValues={pageValues}
      />
    </FieldShell>
  );
}
