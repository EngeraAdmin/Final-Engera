import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getCloudflareEnv } from "@/lib/cf-env";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureSchema } from "@/lib/db-schema";
import { hashPassword, verifyPassword } from "@/lib/password";

export interface AdminUser {
  id: number;
  email: string;
  created_at: string;
  isYou: boolean;
}

export const listAdminsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminUser[]> => {
    const session = await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);
    const { results } = await DB.prepare(
      "SELECT id, email, created_at FROM admin_users ORDER BY id ASC",
    ).all<Omit<AdminUser, "isYou">>();
    return results.map((r) => ({ ...r, isYou: r.id === session.userId }));
  },
);

export const addAdminServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().toLowerCase().min(3, "Enter an email address"),
      password: z.string().min(8, "Use at least 8 characters"),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await ensureSchema(DB);
    const exists = await DB.prepare("SELECT id FROM admin_users WHERE email = ?")
      .bind(data.email)
      .first();
    if (exists) return { ok: false as const, error: "There's already an admin with that email." };
    await DB.prepare("INSERT INTO admin_users (email, password_hash) VALUES (?, ?)")
      .bind(data.email, await hashPassword(data.password))
      .run();
    return { ok: true as const };
  });

export const removeAdminServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const session = await requireAdminSession();
    if (data.id === session.userId) {
      return { ok: false as const, error: "You can't remove your own account while signed in." };
    }
    const { DB } = getCloudflareEnv();
    const count = await DB.prepare("SELECT COUNT(*) AS n FROM admin_users").first<{ n: number }>();
    if ((count?.n ?? 0) <= 1)
      return { ok: false as const, error: "There must be at least one admin." };
    await DB.prepare("DELETE FROM admin_users WHERE id = ?").bind(data.id).run();
    return { ok: true as const };
  });

export const changePasswordServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      current: z.string().min(1, "Enter your current password"),
      next: z.string().min(8, "Use at least 8 characters"),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAdminSession();
    const { DB } = getCloudflareEnv();
    const row = await DB.prepare("SELECT password_hash FROM admin_users WHERE id = ?")
      .bind(session.userId)
      .first<{ password_hash: string }>();
    if (!row || !(await verifyPassword(data.current, row.password_hash))) {
      return { ok: false as const, error: "Your current password isn't right." };
    }
    await DB.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
      .bind(await hashPassword(data.next), session.userId)
      .run();
    return { ok: true as const };
  });

export const setAdminPasswordServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number(), password: z.string().min(8, "Use at least 8 characters") }))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { DB } = getCloudflareEnv();
    await DB.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
      .bind(await hashPassword(data.password), data.id)
      .run();
    return { ok: true as const };
  });
