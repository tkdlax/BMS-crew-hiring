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
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  build: {
    format: "directory",
  },
});
