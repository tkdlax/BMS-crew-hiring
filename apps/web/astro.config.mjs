import { defineConfig } from "astro/config";

const base = process.env.PUBLIC_BASE_PATH || "/hiring";

export default defineConfig({
  base,
  output: "static",
  build: {
    format: "directory",
  },
});
