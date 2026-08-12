import type { NextConfig } from "next";

/*
 * Headers every response carries.
 *
 * The Content-Security-Policy is not here. It carries a per-request
 * nonce, so it cannot be a static header — it is built in src/proxy.ts,
 * which is where the nonce is generated and handed to Next. These are
 * the headers that are the same on every response.
 */
const securityHeaders = [
  /*
   * Browsers may not second-guess a declared content type. Without it
   * an uploaded file served as text/plain can be sniffed as HTML and
   * run, and blog images are uploaded by anyone with an account.
   */
  { key: "X-Content-Type-Options", value: "nosniff" },

  /* The site is never meant to be framed, so clickjacking has no room. */
  { key: "X-Frame-Options", value: "DENY" },

  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  /*
   * Features the site never uses. Declining them means an injected
   * script cannot reach for them either.
   */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },

  /*
   * Vercel serves HTTPS only, so this costs nothing and closes the
   * first plaintext request.
   */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        /*
         * Nothing under /api may sit in a shared cache: the responses
         * are per-account, and a proxy holding one visitor's blog view
         * and handing it to the next would leak it.
         */
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, private" },
        ],
      },
    ];
  },
};

export default nextConfig;
