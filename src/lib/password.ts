import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

async function derive(
  password: string,
  salt: Buffer,
  cost: { N: number; r: number; p: number },
  keyLength = KEY_LENGTH
): Promise<Buffer> {
  return scryptAsync(password.normalize("NFKC"), salt, keyLength, {
    ...cost,
    maxmem: MAX_MEM,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const cost = { N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]) };
  if (
    !Number.isInteger(cost.N) ||
    !Number.isInteger(cost.r) ||
    !Number.isInteger(cost.p) ||
    cost.N < 1024 ||
    cost.N > 1_048_576 ||
    cost.r < 1 ||
    cost.r > 32 ||
    cost.p < 1 ||
    cost.p > 16
  ) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "hex");
    expected = Buffer.from(parts[5], "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await derive(password, salt, cost, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/**
 * Runs the same scrypt work for unknown accounts so login timing does not
 * reveal whether an email exists.
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
