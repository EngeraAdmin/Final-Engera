#!/usr/bin/env node
// One-time helper: hashes a password the same way the app does (PBKDF2-SHA256
// via Web Crypto) and prints a ready-to-run `wrangler d1 execute` command that
// inserts that first admin user. Nothing here talks to your Cloudflare
// account directly — it just prints the SQL for you to run yourself.
//
// Usage:
//   node scripts/create-admin.mjs you@example.org "a strong password"
//
// Optional 3rd argument: PBKDF2 iteration count (default 100000, the maximum
// Cloudflare Workers allows). On the free Workers plan, each request is limited
// to 10 ms of CPU; if logging in ever fails with "Error 1102 / Worker exceeded
// resource limits", re-run this with a lower number (e.g. 50000) and update the
// admin user's password_hash — see README-ADMIN-SETUP.md.

import { webcrypto as crypto } from "node:crypto";

const [, , email, password, iterationsArg] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs "you@example.org" "a strong password"');
  process.exit(1);
}

const ITERATIONS = iterationsArg ? Number.parseInt(iterationsArg, 10) : 100_000;
if (!Number.isInteger(ITERATIONS) || ITERATIONS < 10_000 || ITERATIONS > 100_000) {
  console.error(
    "Iterations must be a whole number between 10000 and 100000 (Cloudflare's maximum).",
  );
  process.exit(1);
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `pbkdf2:${ITERATIONS}:${toHex(salt.buffer)}:${toHex(derived)}`;
}

const hash = await hashPassword(password);
const normalizedEmail = email.trim().toLowerCase().replace(/'/g, "''");
const escapedHash = hash.replace(/'/g, "''");

const sql = `INSERT INTO admin_users (email, password_hash) VALUES ('${normalizedEmail}', '${escapedHash}');`;

console.log("\nRun this against your D1 database (one time only):\n");
console.log(
  `npx wrangler d1 execute engera-db --remote --command "${sql.replace(/"/g, '\\"')}"\n`,
);
console.log("(Drop --remote to insert into your local wrangler dev database instead.)\n");
console.log(
  "Or, to use the Cloudflare dashboard instead (D1 → engera-db → Console), paste just this SQL:\n",
);
console.log(sql + "\n");
