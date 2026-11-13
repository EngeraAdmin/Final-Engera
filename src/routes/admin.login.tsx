import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { Btn, FieldShell, TextInput, useAdminMode } from "@/components/admin/ui";
import heroPhoto from "@/assets/photos/hero.jpg";
import { getAdminSessionServerFn, getDemoInfoServerFn, loginServerFn } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin login — Engera USA" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  // Already signed in? Skip the form.
  beforeLoad: async () => {
    if (await getAdminSessionServerFn()) throw redirect({ to: "/admin" });
  },
  loader: () => getDemoInfoServerFn(),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  useAdminMode();
  const navigate = useNavigate();
  const demo = Route.useLoaderData();
  const [showPassword, setShowPassword] = useState(false);
  // In the local practice demo the login is pre-filled; the server supplies it
  // (nothing demo-related is written into this page's own code).
  const [email, setEmail] = useState(demo.demo ? demo.username : "");
  const [password, setPassword] = useState(demo.demo ? demo.password : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginServerFn({ data: { email, password } });
      if (result.ok) {
        await navigate({ to: "/admin" });
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-ui grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#162236] lg:block">
        <img
          src={heroPhoto}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#162236] via-[#162236]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <BrandLogo light className="[&_img]:h-10" usaClassName="text-white" />
          <p className="mt-6 max-w-md text-2xl font-semibold leading-snug">
            Edit every page of the Engera USA website — no code needed.
          </p>
          <p className="mt-2 max-w-md text-white/75">
            Click any text or photo, change it, and publish when you're happy.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandLogo className="[&_img]:h-9" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1e2635]">Sign in</h1>
          <p className="mt-1 text-sm text-[#69758a]">Staff access to edit the website.</p>

          {demo.demo && (
            <div className="mt-6 rounded-xl border border-[#f5d48a] bg-[#fffaeb] p-4 text-sm">
              <p className="font-semibold text-[#5c3d00]">
                Demo mode — practice copy on this computer
              </p>
              <p className="mt-1 text-[#7a5a1a]">
                Username <strong>{demo.username}</strong> · Password{" "}
                <strong>{demo.password}</strong> — already filled in. Just press Sign in.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <FieldShell label="Email or username" htmlFor="email">
              <TextInput
                id="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FieldShell>
            <FieldShell label="Password" htmlFor="password">
              <div className="relative">
                <TextInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-xs text-[#69758a] hover:text-[#116dff]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </FieldShell>

            {error && (
              <p className="rounded-lg bg-[#fde8e8] px-3 py-2 text-sm text-[#c4282d]">{error}</p>
            )}

            <Btn type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
              Sign in
            </Btn>
          </form>
          <p className="mt-8 text-center text-xs text-[#9aa5b6]">
            Forgotten your password? Another admin can reset it under “Admins & password”.
          </p>
        </div>
      </div>
    </div>
  );
}
