/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type RuntimeEnv = {
  PUBLIC_API_BASE_URL?: string;
  PUBLIC_SITE_BASE_URL?: string;
  PUBLIC_CAPTCHA_SITE_KEY?: string;
  PUBLIC_BASE_PATH?: string;
};

declare namespace App {
  interface Locals {
    runtime: {
      env: RuntimeEnv;
    };
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL: string;
  readonly PUBLIC_SITE_BASE_URL: string;
  readonly PUBLIC_CAPTCHA_SITE_KEY: string;
  readonly PUBLIC_BASE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
