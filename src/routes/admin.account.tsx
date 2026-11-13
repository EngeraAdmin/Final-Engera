import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, UserRound } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, Btn, FieldShell, Panel, TextInput, formatWhen } from "@/components/admin/ui";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  addAdminServerFn,
  changePasswordServerFn,
  listAdminsServerFn,
  removeAdminServerFn,
  setAdminPasswordServerFn,
  type AdminUser,
} from "@/lib/admin-account";

export const Route = createFileRoute("/admin/account")({
  beforeLoad: async () => {
    const session = await requireAdminSession();
    return { session };
  },
  loader: async () => listAdminsServerFn(),
  component: AccountPage,
});

function errorText(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  // Validation errors arrive as JSON; show the first readable message.
  const m = msg.match(/"message":\s*"([^"]+)"/);
  return m?.[1] ?? "Something went wrong — please try again.";
}

function AccountPage() {
  const router = useRouter();
  const admins = Route.useLoaderData();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (next.length < 8) return setPwError("Use at least 8 characters.");
    if (next !== confirm) return setPwError("The two new passwords don't match.");
    setChanging(true);
    try {
      const result = await changePasswordServerFn({ data: { current, next } });
      if (!result.ok) return setPwError(result.error);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed.");
    } catch (err) {
      setPwError(errorText(err));
    } finally {
      setChanging(false);
    }
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (newPassword.length < 8) return setAddError("Use a password of at least 8 characters.");
    setAdding(true);
    try {
      const result = await addAdminServerFn({ data: { email: newEmail, password: newPassword } });
      if (!result.ok) return setAddError(result.error);
      setNewEmail("");
      setNewPassword("");
      await router.invalidate();
      toast.success("Admin added. Send them the website address /admin and their password.");
    } catch (err) {
      setAddError(errorText(err));
    } finally {
      setAdding(false);
    }
  }

  async function remove(a: AdminUser) {
    if (!window.confirm(`Remove ${a.email}? They will no longer be able to sign in.`)) return;
    const result = await removeAdminServerFn({ data: { id: a.id } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await router.invalidate();
    toast.success("Admin removed.");
  }

  async function resetPassword(a: AdminUser) {
    const pw = window.prompt(`New password for ${a.email} (at least 8 characters):`);
    if (!pw) return;
    if (pw.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    try {
      await setAdminPasswordServerFn({ data: { id: a.id, password: pw } });
      toast.success(`Password for ${a.email} changed. Let them know the new one.`);
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  return (
    <AdminShell title="Admins & password" breadcrumb="Who can sign in to edit the website">
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Panel title="People who can edit the website">
          <ul className="-my-2 divide-y divide-[#eef1f5]">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e7f0ff] text-[#116dff]">
                  <UserRound className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 truncate text-sm font-medium">
                    {a.email} {a.isYou && <Badge tone="blue">You</Badge>}
                  </span>
                  <span className="text-xs text-[#9aa5b6]">Added {formatWhen(a.created_at)}</span>
                </span>
                {!a.isYou && (
                  <>
                    <button
                      onClick={() => void resetPassword(a)}
                      className="cursor-pointer rounded-md p-2 text-[#7b879b] hover:bg-[#eef1f5] hover:text-[#116dff]"
                      title="Set a new password"
                    >
                      <KeyRound className="size-4" />
                    </button>
                    <button
                      onClick={() => void remove(a)}
                      className="cursor-pointer rounded-md p-2 text-[#7b879b] hover:bg-[#fde8e8] hover:text-[#e5484d]"
                      title="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <form
            onSubmit={addAdmin}
            className="mt-5 flex flex-col gap-3 rounded-xl bg-[#f7f8fa] p-4"
          >
            <p className="text-sm font-medium">Add an admin</p>
            <TextInput
              type="email"
              placeholder="their@email.org"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <TextInput
              type="text"
              placeholder="A password for them (8+ characters)"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {addError && <p className="text-sm text-[#e5484d]">{addError}</p>}
            <Btn type="submit" variant="primary" size="sm" loading={adding} className="self-start">
              <Plus className="size-4" /> Add admin
            </Btn>
          </form>
        </Panel>

        <Panel title="Change your password">
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            <FieldShell label="Current password" htmlFor="pw-current">
              <TextInput
                id="pw-current"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </FieldShell>
            <FieldShell
              label="New password"
              help="At least 8 characters — longer is safer."
              htmlFor="pw-next"
            >
              <TextInput
                id="pw-next"
                type="password"
                autoComplete="new-password"
                required
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </FieldShell>
            <FieldShell label="New password again" htmlFor="pw-confirm">
              <TextInput
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </FieldShell>
            {pwError && <p className="text-sm text-[#e5484d]">{pwError}</p>}
            <Btn type="submit" variant="primary" loading={changing} className="self-start">
              Change password
            </Btn>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}
