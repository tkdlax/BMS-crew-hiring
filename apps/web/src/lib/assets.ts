function normalizedBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/** Resolve a public asset path under the Astro base (e.g. /hiring/styles/foo.css). */
export function assetUrl(path: string): string {
  return `${normalizedBase()}${path.replace(/^\//, "")}`;
}

/** Resolve an in-app route (e.g. operations/ → /hiring/operations/). */
export function hrefPath(path: string): string {
  return `${normalizedBase()}${path.replace(/^\//, "")}`;
}
