/** Resolve a public asset path under the Astro base (e.g. /hiring/styles/foo.css). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}${path.replace(/^\//, "")}`;
}
