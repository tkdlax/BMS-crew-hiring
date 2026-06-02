import { describe, it, expect } from "@jest/globals";

process.env.ALLOWED_ORIGINS = "http://localhost:4321,https://www.baileysallied.com";
process.env.PUBLIC_SITE_BASE_URL = "https://www.baileysallied.com/hiring";

const { resolveCorsOrigin, getAllowedOrigins } = await import("../dist/src/http/cors.js");

describe("cors origin resolution", () => {
  it("allows configured origin and www variant", () => {
    expect(getAllowedOrigins()).toContain("https://baileysallied.com");
    expect(resolveCorsOrigin("https://www.baileysallied.com")).toBe(
      "https://www.baileysallied.com"
    );
    expect(resolveCorsOrigin("https://baileysallied.com")).toBe("https://baileysallied.com");
  });

  it("rejects unknown origins", () => {
    expect(resolveCorsOrigin("https://evil.example")).toBeNull();
  });
});
