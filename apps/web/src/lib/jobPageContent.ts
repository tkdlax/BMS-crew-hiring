import { formatDetailsCompensation, formatHeroCompensation } from "@bms/shared";
import { BRAND } from "../constants/brand";

export type JobVideo = { title: string; youtubeId: string };

export type JobDetailsBlock = {
  title: string;
  compensation: string;
  compensationNote?: string;
  location: string;
  requirements: string[];
  benefits: string[];
};

export type JobPageContent = {
  heroEyebrow?: string;
  headline?: string;
  heroLead?: string;
  compensation?: string;
  compensationNote?: string;
  address?: string;
  addressOverride?: boolean;
  heroImage?: string;
  formTitle?: string;
  formSubtitle?: string;
  learnSectionTitle?: string;
  interestOptions?: string[];
  trainingNote?: string;
  videos?: JobVideo[];
  jobDetails?: JobDetailsBlock;
  aboutUrl?: string;
};

export type JobPageMeta = {
  title: string;
  officeName: string;
  locationLabel: string;
  payMinHourly?: number | null;
  payMaxHourly?: number | null;
};

const DENVER_VIDEOS: JobVideo[] = [
  { title: "Hear From Employees", youtubeId: "1WYvchjYBXU" },
  { title: "Hear From A Customer", youtubeId: "-pnkJe0ALAE" },
  { title: "Hear From A Master Mover", youtubeId: "7GVmdYHKUE4" },
  { title: "Get To Know Us", youtubeId: "LoDlPPyDaKw" },
];

const CREW_REQUIREMENTS = [
  "Must be 17 years or older",
  "Must be capable of heavy lifting over 8-hour days",
  "Must pass background check",
  "Must agree to code of conduct",
];

const CREW_BENEFITS = [
  "Medical/Dental with HSA/FSA",
  "401k with Employer Match",
  "Personal Time Off",
  "CDL Training (if desired)",
];

const STANDARD_INTEREST = [
  "Driver",
  "Mover & Packer",
  "Summer or Temporary Help",
  "I'm new, I want to start a career",
];

const DEFAULT_PAY_MIN = 17;
const DEFAULT_PAY_MAX = 25;

const SHARED_DETAILS = {
  title: "Moving Operations Crew",
  compensation: formatDetailsCompensation(DEFAULT_PAY_MIN, DEFAULT_PAY_MAX),
  compensationNote: "(plus benefits for full-time)",
  requirements: CREW_REQUIREMENTS,
  benefits: CREW_BENEFITS,
};

const OFFICE_DEFAULTS: Record<string, JobPageContent> = {
  denver: {
    heroEyebrow: "Work in Denver · Centennial, CO",
    headline: "Get Your Colorado Career On The Move.",
    heroLead:
      "Movers are the core of our company, and our industry. Join the storied history of the men and women who keep our nation moving.",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Denver Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
  "colorado-springs": {
    heroEyebrow: "Work in Colorado Springs, CO",
    headline: "Get Your Colorado Career On The Move.",
    heroLead:
      "Movers are the core of our company. Join our Colorado Springs team and help families relocate with care.",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Colorado Springs Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
  "grand-junction": {
    heroEyebrow: "Work in Grand Junction, CO",
    headline: "Join Our Grand Junction Moving Team.",
    heroLead: "Help families and businesses move on Colorado's Western Slope.",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Grand Junction Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
  "salt-lake-city": {
    heroEyebrow: "Work in Salt Lake City, UT",
    headline: "Join Our Salt Lake City Moving Team.",
    heroLead: "Be part of Bailey's operations serving the Wasatch Front.",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Salt Lake City Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
};

function pick<T>(api: T | undefined, fallback: T): T {
  return api !== undefined && api !== null && api !== "" ? api : fallback;
}

function resolvePayRange(meta: JobPageMeta): { min: number; max: number } | null {
  const min = meta.payMinHourly;
  const max = meta.payMaxHourly;
  if (min == null || max == null || Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max };
}

function resolveAddress(api: JobPageContent, locationLabel: string): string {
  const office = locationLabel?.trim();
  const jobOverride = api.addressOverride && api.address?.trim();
  if (jobOverride) return jobOverride;
  if (office) return office;
  return api.address?.trim() || "";
}

function formatLocationDisplay(address: string): string {
  if (!address) return "";
  if (address.includes("\n")) return address;
  const comma = address.indexOf(",");
  if (comma > 0 && comma < address.length - 1) {
    return `${address.slice(0, comma).trim()}\n${address.slice(comma + 1).trim()}`;
  }
  return address;
}

export function isKnownOperationsOffice(officeSlug: string): boolean {
  return officeSlug in OFFICE_DEFAULTS;
}

export function mergeJobPageContent(
  officeSlug: string,
  _jobSlug: string,
  apiContent: Record<string, unknown> | null | undefined,
  meta: JobPageMeta
): JobPageContent {
  const base = OFFICE_DEFAULTS[officeSlug] ?? {};
  const api = (apiContent ?? {}) as JobPageContent;

  const payRange = resolvePayRange(meta) ?? { min: DEFAULT_PAY_MIN, max: DEFAULT_PAY_MAX };
  const heroCompensation = formatHeroCompensation(payRange.min, payRange.max);
  const detailsCompensation = formatDetailsCompensation(payRange.min, payRange.max);

  const address = resolveAddress(api, meta.locationLabel);
  const locationDisplay = formatLocationDisplay(address);

  const jobDetails = api.jobDetails ?? base.jobDetails;
  const mergedDetails: JobDetailsBlock | undefined = jobDetails
    ? {
        title: pick(api.jobDetails?.title, jobDetails.title),
        compensation: detailsCompensation ?? pick(api.jobDetails?.compensation, jobDetails.compensation),
        compensationNote: pick(api.jobDetails?.compensationNote, jobDetails.compensationNote),
        location: locationDisplay || pick(api.jobDetails?.location, jobDetails.location),
        requirements: api.jobDetails?.requirements?.length
          ? api.jobDetails.requirements
          : jobDetails.requirements,
        benefits: api.jobDetails?.benefits?.length ? api.jobDetails.benefits : jobDetails.benefits,
      }
    : undefined;

  return {
    heroEyebrow: pick(api.heroEyebrow, base.heroEyebrow ?? meta.officeName),
    headline: pick(api.headline, base.headline ?? meta.title),
    heroLead: pick(api.heroLead, base.heroLead ?? (api as { description?: string }).description),
    compensation: heroCompensation,
    compensationNote: pick(api.compensationNote, base.compensationNote),
    address: address || undefined,
    heroImage: pick(api.heroImage, base.heroImage ?? BRAND.heroImage),
    formTitle: pick(api.formTitle, base.formTitle ?? `Apply — ${meta.title}`),
    formSubtitle: pick(api.formSubtitle, base.formSubtitle),
    learnSectionTitle: pick(api.learnSectionTitle, base.learnSectionTitle),
    interestOptions: api.interestOptions?.length ? api.interestOptions : base.interestOptions,
    trainingNote: pick(api.trainingNote, base.trainingNote),
    videos: api.videos?.length ? api.videos : base.videos,
    jobDetails: mergedDetails,
    aboutUrl: pick(api.aboutUrl, base.aboutUrl ?? `${BRAND.mainSite}/about-us`),
  };
}
