const LOCAL_BACKEND_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

interface CatalogBackendConfig {
  error?: string;
  url?: URL;
}

function withProtocol(value: string): string {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`;
}

function isLocalHost(hostname: string): boolean {
  return LOCAL_BACKEND_HOSTS.has(hostname.replace(/^\[|\]$/g, ""));
}

export function getCatalogBackendConfig(): CatalogBackendConfig {
  const configured = process.env.BACKEND_URL?.trim();

  if (!configured) {
    return { error: "The catalog service is not configured." };
  }

  let url: URL;

  try {
    url = new URL(withProtocol(configured));
  } catch {
    return { error: "The catalog service URL is invalid." };
  }

  if (process.env.VERCEL === "1" && isLocalHost(url.hostname)) {
    return {
      error:
        "The catalog service is pointed at localhost. Set BACKEND_URL to the deployed backend URL.",
    };
  }

  return { url };
}
