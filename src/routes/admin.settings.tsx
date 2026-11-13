import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  AutoTextarea,
  Btn,
  FieldShell,
  Panel,
  TextInput,
  useUnsavedWarning,
} from "@/components/admin/ui";
import { Switch } from "@/components/ui/switch";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  HIDE_VALUE,
  SETTINGS_GROUPS,
  getSettingsServerFn,
  saveSettingsServerFn,
} from "@/lib/admin-settings";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: async () => {
    const session = await requireAdminSession();
    return { session };
  },
  loader: async () => getSettingsServerFn(),
  component: SettingsPage,
});

function SettingsPage() {
  const router = useRouter();
  const loaded = Route.useLoaderData();
  const [values, setValues] = useState<Record<string, string>>(loaded);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(loaded);
  useUnsavedWarning(dirty);

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettingsServerFn({ data: values });
      await router.invalidate();
      toast.success("Settings saved — the website uses them straight away.");
    } catch {
      toast.error("Couldn't save the settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <AdminShell
      title="Settings"
      breadcrumb="Used across the whole website"
      actions={
        <>
          {dirty && (
            <Btn variant="ghost" onClick={() => setValues(loaded)}>
              Discard
            </Btn>
          )}
          <Btn variant="primary" onClick={handleSave} loading={saving} disabled={!dirty}>
            Save settings
          </Btn>
        </>
      }
    >
      <div className="flex max-w-3xl flex-col gap-6">
        {SETTINGS_GROUPS.map((group) => (
          <Panel key={group.id} title={group.title} description={group.description}>
            <div className="flex flex-col gap-5">
              {group.fields.map((f) => {
                const value = values[f.key] ?? "";
                const off = value === HIDE_VALUE;
                return (
                  <FieldShell
                    key={f.key}
                    label={f.label}
                    help={
                      off
                        ? "Hidden on the website."
                        : (f.help ??
                          (f.placeholder && !value && f.placeholder.startsWith("http")
                            ? "Empty = keeps using the link shown in grey."
                            : undefined))
                    }
                    htmlFor={`s-${f.key}`}
                    aside={
                      f.hideable ? (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-[#69758a]">
                          Show
                          <Switch
                            checked={!off}
                            onCheckedChange={(on) => set(f.key, on ? "" : HIDE_VALUE)}
                          />
                        </label>
                      ) : undefined
                    }
                  >
                    {f.type === "textarea" ? (
                      <AutoTextarea
                        id={`s-${f.key}`}
                        minRows={2}
                        value={value}
                        placeholder={f.placeholder}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <TextInput
                          id={`s-${f.key}`}
                          type={f.type === "email" ? "email" : "text"}
                          value={off ? "" : value}
                          disabled={off}
                          placeholder={f.placeholder}
                          onChange={(e) => set(f.key, e.target.value)}
                        />
                        {f.type === "url" && (value || f.placeholder) && !off && (
                          <a
                            href={value || f.placeholder}
                            target="_blank"
                            rel="noreferrer"
                            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#d5dbe3] text-[#69758a] hover:border-[#116dff] hover:text-[#116dff]"
                            title="Test the link"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </FieldShell>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </AdminShell>
  );
}
