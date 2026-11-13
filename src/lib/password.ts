/**
 * Password hashing via PBKDF2-SHA256, using the Web Crypto API — this runs
 * identically in Cloudflare Workers and in Node, unlike bcrypt (which needs a
 * native addon Workers can't run). Stored format:
 *   pbkdf2:<iterations>:<salt-hex>:<hash-hex>
 */

// Cloudflare Workers' Web Crypto REJECTS PBKDF2 iteration counts above 100,000
// (it throws), so this is the highest value that works there. OWASP recommends
// more for PBKDF2-SHA256, but the platform cap wins — don't raise this above
// 100_000 or logins will fail on the deployed site.
const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return toHex(derived);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2:${ITERATIONS}:${toHex(salt.buffer as ArrayBuffer)}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[1]!, 10);
  const salt = fromHex(parts[2]!);
  const expectedHash = parts[3]!;
  if (!Number.isFinite(iterations) || salt.length === 0 || expectedHash.length === 0) return false;

  const actualHash = await derive(password, salt, iterations);

  // Constant-time comparison — avoids leaking hash contents via timing.
  if (actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i++) {
    diff |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}
