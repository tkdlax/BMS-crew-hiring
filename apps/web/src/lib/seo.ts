import { BRAND } from "../constants/brand";
import { HIRING_IMAGES, OG_IMAGE_BY_ROUTE } from "../constants/images";

export const SITE_NAME = "Bailey's Operations Hiring";

export const DEFAULT_DESCRIPTION =
  "Apply for driver, crew, and moving operations roles at Bailey's Moving & Storage in Colorado and Utah. Training provided, full-time or seasonal.";

export const PAGE_SEO = {
  home: {
    title: "Join our operations team",
    description:
      "Bailey's hires movers, drivers, and packers across Colorado and Utah. Full-time or seasonal roles with training provided and real career progression.",
    ogImage: OG_IMAGE_BY_ROUTE.home,
  },
  operations: {
    title: "Moving operations crew openings",
    description:
      "Open moving operations crew roles in Denver, Colorado Springs, Grand Junction, and Salt Lake City. Apply in about 2 minutes — no resume required.",
    ogImage: OG_IMAGE_BY_ROUTE.operations,
  },
  careerPath: {
    title: "Your path from mover to driver",
    description:
      "See how Bailey's movers advance from crew member to team leader and CDL driver — requirements, training, pay tiers, and what comes next.",
    ogImage: OG_IMAGE_BY_ROUTE.careerPath,
  },
  cdlDrivers: {
    title: "Wanted: CDL Drivers",
    description:
      "Drive for a team that works for you. Bailey's Moving & Storage hires CDL drivers with packing opportunities, incentive pay, top equipment, and experienced dispatch.",
    ogImage: OG_IMAGE_BY_ROUTE.cdlDrivers,
  },
  schedule: {
    title: "Schedule your interview",
    description:
      "Pick a date and time for your in-person interview with Bailey's Moving & Storage. Confirm your slot and add it to your calendar.",
    ogImage: OG_IMAGE_BY_ROUTE.schedule,
  },
  schedulePreview: {
    title: "Schedule preview",
    description: "Internal preview of interview scheduling availability.",
    ogImage: OG_IMAGE_BY_ROUTE.schedulePreview,
    noIndex: true,
  },
} as const;

export type PageSeoInput = {
  title: string;
  description?: string;
  ogImage?: string;
  ogImageAlt?: string;
  pathname: string;
  noIndex?: boolean;
};

export type PageSeo = {
  documentTitle: string;
  ogTitle: string;
  description: string;
  ogImage: string;
  ogImageAlt: string;
  canonicalUrl: string;
  noIndex: boolean;
};

function resolveSiteBaseUrl(locals?: App.Locals): string {
  const configured =
    locals?.runtime?.env?.PUBLIC_SITE_BASE_URL?.trim() ||
    import.meta.env.PUBLIC_SITE_BASE_URL?.trim() ||
    `${BRAND.mainSite}/hiring`;
  return configured.replace(/\/$/, "");
}

export function buildCanonicalUrl(pathname: string, locals?: App.Locals): string {
  const siteBase = resolveSiteBaseUrl(locals);
  const baseForUrl = siteBase.endsWith("/") ? siteBase : `${siteBase}/`;
  return new URL(pathname, baseForUrl).href;
}

export function buildPageSeo(input: PageSeoInput, locals?: App.Locals): PageSeo {
  const description = input.description?.trim() || DEFAULT_DESCRIPTION;
  const ogImage = input.ogImage?.trim() || HIRING_IMAGES.heroMover;
  const ogTitle = input.title.trim();
  const ogImageAlt = input.ogImageAlt?.trim() || "Bailey's Moving & Storage operations crew";

  return {
    documentTitle: `${ogTitle} | ${SITE_NAME}`,
    ogTitle,
    description,
    ogImage,
    ogImageAlt,
    canonicalUrl: buildCanonicalUrl(input.pathname, locals),
    noIndex: Boolean(input.noIndex),
  };
}

export function applyPageSeo(opts: {
  headline: string;
  heroLead?: string | null;
  officeName?: string | null;
  ogImage: string;
  pathname: string;
}): PageSeoInput {
  const office = opts.officeName?.trim();
  const lead = opts.heroLead?.trim();
  const description = lead
    ? office
      ? `${lead} Apply for moving operations crew roles in ${office}.`
      : lead
    : office
      ? `Apply for moving operations crew roles with Bailey's in ${office}. Training provided — no moving experience required.`
      : DEFAULT_DESCRIPTION;

  return {
    title: opts.headline,
    description,
    ogImage: opts.ogImage,
    ogImageAlt: office
      ? `Bailey's Moving & Storage operations crew in ${office}`
      : "Bailey's Moving & Storage operations crew",
    pathname: opts.pathname,
  };
}
