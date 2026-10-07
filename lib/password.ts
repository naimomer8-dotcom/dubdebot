import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize("NFKC"), salt, 64, PARAMS);
  return `scrypt$${PARAMS.N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [alg, n, s, k] = stored.split("$");
  if (alg !== "scrypt" || !s || !k) return false;
  const expected = Buffer.from(k, "base64url");
  const key = await scrypt(pw.normalize("NFKC"), Buffer.from(s, "base64url"), expected.length, { ...PARAMS, N: Number(n) || PARAMS.N });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Returns an error message in Hebrew, or null if the password is acceptable. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "לפחות 8 תווים";
  if (pw.length > 128) return "ארוכה מדי";
  if (!/[A-Za-z֐-׿]/.test(pw) || !/\d/.test(pw)) return "צריך לשלב אותיות ומספרים";
  return null;
}

export const newToken = () => randomBytes(32).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
