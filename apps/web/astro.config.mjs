import { defineConfig } from "astro/config";

/** Astro expects base to end with `/` so BASE_URL + "styles/..." resolves correctly. */
const base = (process.env.PUBLIC_BASE_PATH || "/hiring").replace(/\/?$/, "/");

export default defineConfig({
  base,
  output: "static",
  build: {
    format: "directory",
  },
});
