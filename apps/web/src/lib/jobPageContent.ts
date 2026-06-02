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

const SHARED_DETAILS = {
  title: "Moving Operations Crew",
  compensation: "Full-time or Seasonal | $17-25/hr (DOE)",
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
    compensation: "$17–$25/hr + CASH tips",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    address: "11755 E Peakview Ave, Centennial CO 80111",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Denver Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "11755 E Peakview Ave\nCentennial, CO 80111" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
  "colorado-springs": {
    heroEyebrow: "Work in Colorado Springs, CO",
    headline: "Get Your Colorado Career On The Move.",
    heroLead:
      "Movers are the core of our company. Join our Colorado Springs team and help families relocate with care.",
    compensation: "$17–$25/hr + CASH tips",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    address: "Colorado Springs, CO",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Colorado Springs Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "Colorado Springs, CO" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
  "grand-junction": {
    heroEyebrow: "Work in Grand Junction, CO",
    headline: "Join Our Grand Junction Moving Team.",
    heroLead: "Help families and businesses move on Colorado's Western Slope.",
    compensation: "$17–$25/hr + CASH tips",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    address: "Grand Junction, CO",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Grand Junction Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "Grand Junction, CO" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
  "salt-lake-city": {
    heroEyebrow: "Work in Salt Lake City, UT",
    headline: "Join Our Salt Lake City Moving Team.",
    heroLead: "Be part of Bailey's operations serving the Wasatch Front.",
    compensation: "$17–$25/hr + CASH tips",
    compensationNote: "Full-time or Seasonal · Benefits available for full-time",
    address: "Salt Lake City, UT",
    heroImage: BRAND.heroImage,
    formTitle: "Apply to Join Our Salt Lake City Team",
    formSubtitle: "Takes under 2 minutes — no resume required.",
    learnSectionTitle: "Learn About The Job and What It's Like:",
    interestOptions: STANDARD_INTEREST,
    trainingNote: "We do not require moving industry experience. Training is provided to all.",
    videos: DENVER_VIDEOS,
    jobDetails: { ...SHARED_DETAILS, location: "Salt Lake City, UT" },
    aboutUrl: `${BRAND.mainSite}/about-us`,
  },
};

function pick<T>(api: T | undefined, fallback: T): T {
  return api !== undefined && api !== null && api !== "" ? api : fallback;
}

export function isKnownOperationsOffice(officeSlug: string): boolean {
  return officeSlug in OFFICE_DEFAULTS;
}

export function mergeJobPageContent(
  officeSlug: string,
  _jobSlug: string,
  apiContent: Record<string, unknown> | null | undefined,
  meta: { title: string; officeName: string; locationLabel: string }
): JobPageContent {
  const base = OFFICE_DEFAULTS[officeSlug] ?? {};
  const api = (apiContent ?? {}) as JobPageContent;

  const jobDetails = api.jobDetails ?? base.jobDetails;
  const mergedDetails: JobDetailsBlock | undefined = jobDetails
    ? {
        title: pick(api.jobDetails?.title, jobDetails.title),
        compensation: pick(api.jobDetails?.compensation, jobDetails.compensation),
        compensationNote: pick(api.jobDetails?.compensationNote, jobDetails.compensationNote),
        location: pick(api.jobDetails?.location, jobDetails.location) || meta.locationLabel,
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
    compensation: pick(api.compensation, base.compensation),
    compensationNote: pick(api.compensationNote, base.compensationNote),
    address: pick(api.address, base.address ?? meta.locationLabel),
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
