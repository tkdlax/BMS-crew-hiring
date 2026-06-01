/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL: string;
  readonly PUBLIC_SITE_BASE_URL: string;
  readonly PUBLIC_CAPTCHA_SITE_KEY: string;
  readonly PUBLIC_BASE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
