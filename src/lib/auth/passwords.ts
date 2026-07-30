import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

/*
 * scrypt via node:crypto — no native dependencies, works on the Vercel
 * Node.js runtime. Format: scrypt$N$r$p$<salt b64>$<key b64>.
 */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_INPUT_LENGTH = 256;

export function hashSecret(secret: string): string {
  const normalized = secret.slice(0, MAX_INPUT_LENGTH);
  const salt = randomBytes(16);

  const key = scryptSync(normalized, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export function verifySecret(secret: string, storedHash: string): boolean {
  const parts = storedHash.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const cost = Number.parseInt(parts[1], 10);
  const blockSize = Number.parseInt(parts[2], 10);
  const parallelism = Number.parseInt(parts[3], 10);

  if (
    !Number.isInteger(cost) ||
    !Number.isInteger(blockSize) ||
    !Number.isInteger(parallelism)
  ) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;

  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }

  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  let actual: Buffer;

  try {
    actual = scryptSync(
      secret.slice(0, MAX_INPUT_LENGTH),
      salt,
      expected.length,
      {
        N: cost,
        r: blockSize,
        p: parallelism,
      },
    );
  } catch {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

/*
 * Security answers are compared case-insensitively with collapsed
 * whitespace, so "New  York" matches "new york".
 */
export function normalizeSecurityAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}
