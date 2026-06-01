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
  address?: string;
  heroImage?: string;
  formTitle?: string;
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

const DEFAULTS: Record<string, Record<string, JobPageContent>> = {
  denver: {
    "crew-member": {
      heroEyebrow: "Work in Denver",
      headline: "Get Your Colorado Career On The Move.",
      heroLead:
        "Movers are the core of our company, and our industry. Join the storied history of the men and women who keep our nation moving.",
      compensation:
        "Full-time or Seasonal BOE $17 - $25/hr + CASH tips (full-time benefits available).",
      address: "11755 E Peakview Ave Centennial, CO 80111",
      heroImage: BRAND.heroImage,
      formTitle: "Apply to Join Our Denver Team",
      learnSectionTitle: "Learn About The Job and What It's Like:",
      interestOptions: [
        "Driver",
        "Mover & Packer",
        "Summer or Temporary Help",
        "I'm new, I want to start a career",
      ],
      trainingNote:
        "We do not require moving industry experience. Training is provided to all.",
      videos: DENVER_VIDEOS,
      jobDetails: {
        title: "Moving Operations Crew Positions",
        compensation: "Full-time or Seasonal | $17-25/hr (DOE)",
        compensationNote: "(plus benefits for full-time)",
        location: "11755 E Peakview Ave\nCentennial, CO 80111",
        requirements: CREW_REQUIREMENTS,
        benefits: CREW_BENEFITS,
      },
      aboutUrl: `${BRAND.mainSite}/about-us`,
    },
    driver: {
      heroEyebrow: "Work in Denver",
      headline: "Drive Your Colorado Career Forward.",
      heroLead:
        "Our drivers are trusted professionals who represent Bailey's on every route. Join a team with decades of experience moving families and businesses.",
      compensation: "Competitive hourly pay (DOE) + tips where applicable.",
      address: "11755 E Peakview Ave Centennial, CO 80111",
      heroImage: BRAND.heroImage,
      formTitle: "Apply to Join Our Denver Driving Team",
      learnSectionTitle: "Learn About The Job and What It's Like:",
      interestOptions: ["Local Driver", "Long Distance / Linehaul", "I'm new, I want to start a career"],
      trainingNote: "CDL training available for qualified candidates.",
      videos: DENVER_VIDEOS,
      jobDetails: {
        title: "Driver Positions",
        compensation: "Full-time | DOE",
        compensationNote: "(plus benefits for full-time)",
        location: "11755 E Peakview Ave\nCentennial, CO 80111",
        requirements: [
          "Valid driver's license (CDL preferred for some roles)",
          "Clean driving record",
          "Must pass background check",
          "Must agree to code of conduct",
        ],
        benefits: CREW_BENEFITS,
      },
      aboutUrl: `${BRAND.mainSite}/about-us`,
    },
  },
  "colorado-springs": {
    "crew-member": {
      heroEyebrow: "Work in Colorado Springs",
      headline: "Get Your Colorado Career On The Move.",
      heroLead:
        "Movers are the core of our company. Join our Colorado Springs team and help families relocate with care.",
      compensation: "Full-time or Seasonal BOE $17 - $25/hr + CASH tips (full-time benefits available).",
      address: "Colorado Springs, CO",
      heroImage: BRAND.heroImage,
      formTitle: "Apply to Join Our Colorado Springs Team",
      learnSectionTitle: "Learn About The Job and What It's Like:",
      interestOptions: [
        "Driver",
        "Mover & Packer",
        "Summer or Temporary Help",
        "I'm new, I want to start a career",
      ],
      trainingNote:
        "We do not require moving industry experience. Training is provided to all.",
      videos: DENVER_VIDEOS,
      jobDetails: {
        title: "Moving Operations Crew Positions",
        compensation: "Full-time or Seasonal | $17-25/hr (DOE)",
        compensationNote: "(plus benefits for full-time)",
        location: "Colorado Springs, CO",
        requirements: CREW_REQUIREMENTS,
        benefits: CREW_BENEFITS,
      },
      aboutUrl: `${BRAND.mainSite}/about-us`,
    },
    driver: {
      heroEyebrow: "Work in Colorado Springs",
      headline: "Drive With Bailey's in Colorado Springs.",
      heroLead: "Join our professional driving team serving the Pikes Peak region.",
      compensation: "Competitive hourly pay (DOE).",
      address: "Colorado Springs, CO",
      heroImage: BRAND.heroImage,
      formTitle: "Apply to Join Our Colorado Springs Driving Team",
      learnSectionTitle: "Learn About The Job and What It's Like:",
      interestOptions: ["Local Driver", "Long Distance / Linehaul", "I'm new, I want to start a career"],
      trainingNote: "CDL training available for qualified candidates.",
      videos: DENVER_VIDEOS,
      jobDetails: {
        title: "Driver Positions",
        compensation: "Full-time | DOE",
        location: "Colorado Springs, CO",
        requirements: [
          "Valid driver's license",
          "Clean driving record",
          "Must pass background check",
        ],
        benefits: CREW_BENEFITS,
      },
      aboutUrl: `${BRAND.mainSite}/about-us`,
    },
  },
};

function pick<T>(api: T | undefined, fallback: T): T {
  return api !== undefined && api !== null && api !== "" ? api : fallback;
}

export function mergeJobPageContent(
  officeSlug: string,
  jobSlug: string,
  apiContent: Record<string, unknown> | null | undefined,
  meta: { title: string; officeName: string; locationLabel: string }
): JobPageContent {
  const base = DEFAULTS[officeSlug]?.[jobSlug] ?? {};
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
    heroLead: pick(
      api.heroLead,
      base.heroLead ?? (api as { description?: string }).description
    ),
    compensation: pick(api.compensation, base.compensation),
    address: pick(api.address, base.address ?? meta.locationLabel),
    heroImage: pick(api.heroImage, base.heroImage ?? BRAND.heroImage),
    formTitle: pick(api.formTitle, base.formTitle ?? `Apply — ${meta.title}`),
    learnSectionTitle: pick(api.learnSectionTitle, base.learnSectionTitle),
    interestOptions: api.interestOptions?.length ? api.interestOptions : base.interestOptions,
    trainingNote: pick(api.trainingNote, base.trainingNote),
    videos: api.videos?.length ? api.videos : base.videos,
    jobDetails: mergedDetails,
    aboutUrl: pick(api.aboutUrl, base.aboutUrl ?? `${BRAND.mainSite}/about-us`),
  };
}
