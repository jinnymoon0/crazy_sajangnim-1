/*
 * Mint a signed session cookie for local checking, so a gated page can
 * be opened without going through Google.
 *
 * Lives inside the project because it imports next-auth's own encoder —
 * the cookie has to be sealed exactly the way the app expects to open
 * it, and a script outside the project cannot resolve that module.
 *
 *   node scripts/mint-session.mjs <google_sub> <email>
 */

import { readFileSync } from "node:fs";

import { encode } from "next-auth/jwt";

/* .env.local is not loaded for a bare node script. */
for (const line of readFileSync(
  new URL("../.env.local", import.meta.url),
  "utf8",
).split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());

  if (match) {
    process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
  }
}

const [sub, email] = process.argv.slice(2);

if (!sub) {
  console.error("usage: node scripts/mint-session.mjs <google_sub> [email]");
  process.exit(1);
}

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!secret) {
  console.error("AUTH_SECRET is not set.");
  process.exit(1);
}

const token = await encode({
  token: {
    sub,
    email: email ?? null,
    googleEmailVerified: true,
  },
  secret,
  salt: "authjs.session-token",
  maxAge: 60 * 60,
});

console.log(token);
