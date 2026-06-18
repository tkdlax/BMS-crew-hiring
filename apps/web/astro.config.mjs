import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

/** Astro expects base to end with `/` so BASE_URL + "styles/..." resolves correctly. */
const base = (process.env.PUBLIC_BASE_PATH || "/hiring").replace(/\/?$/, "/");

const apiBase = process.env.PUBLIC_API_BASE_URL?.trim();
if (!apiBase) {
  console.warn(
    "\n⚠  PUBLIC_API_BASE_URL is not set at build time (expected on Webflow Cloud).\n" +
      "   The site will load it at runtime from /api/public-config.\n"
  );
}

export default defineConfig({
  base,
  output: "static",
  security: {
    // Allow same-origin POST/PUT/DELETE through the Cloudflare worker proxy (CSRF origin
    // checks can 403 before our API route handlers run on Webflow Cloud).
    checkOrigin: false,
  },
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  build: {
    format: "directory",
  },
});
