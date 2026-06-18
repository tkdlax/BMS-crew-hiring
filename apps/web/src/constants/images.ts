import { BRAND } from "./brand";

/** Mover and fleet photos from Bailey's Webflow CDN — used on pages and social previews. */
export const HIRING_IMAGES = {
  heroMover: BRAND.heroImage,
  packers:
    "https://cdn.prod.website-files.com/65a9a00747a21b83f91a2d57/6605dcb5b748788aaf20a6cc_Hispanic%20Packers-600x400-9801ebf.webp",
  cdlDriver:
    "https://cdn.prod.website-files.com/65a9a00747a21b83f91a2d57/6602ef9d0eb8336edd2cd556_CDL%20Driver.webp",
  tractor:
    "https://cdn.prod.website-files.com/65a9a00747a21b83f91a2d57/6602ee5fc199de26ed0e15de_cover.webp",
  family:
    "https://cdn.prod.website-files.com/65a9a00747a21b83f91a2d57/6605dcb4111ed12eea8fac3d_Young%20Family%202-600x427-e582596.webp",
} as const;

/** Rotates OG images across public pages. */
export const OG_IMAGE_BY_ROUTE = {
  home: HIRING_IMAGES.heroMover,
  operations: HIRING_IMAGES.packers,
  careerPath: HIRING_IMAGES.cdlDriver,
  cdlDrivers: HIRING_IMAGES.tractor,
  schedule: HIRING_IMAGES.family,
  schedulePreview: HIRING_IMAGES.tractor,
} as const;

/** Local assets pulled from teambaileys.com (served from /cdl/). */
export const CDL_PAGE_IMAGES = {
  hero: "cdl/cover.jpg",
  parallax: "cdl/parallax-bg.jpg",
  team: (filename: string) => `cdl/${filename}`,
} as const;

const OFFICE_OG_IMAGES: Record<string, string> = {
  denver: HIRING_IMAGES.packers,
  "colorado-springs": HIRING_IMAGES.cdlDriver,
  "grand-junction": HIRING_IMAGES.tractor,
  "salt-lake-city": HIRING_IMAGES.family,
};

/** Pick a social preview image for an apply page by office. */
export function ogImageForOffice(officeSlug: string, heroImage?: string | null): string {
  if (heroImage?.trim()) return heroImage.trim();
  return OFFICE_OG_IMAGES[officeSlug] ?? HIRING_IMAGES.heroMover;
}
