import { OPERATIONS_JOB_SLUG } from "../constants/jobs";
import { OPERATIONS_OFFICE_ORDER } from "../constants/offices";

export type Opening = {
  office_slug: string;
  office_name: string;
  job_slug: string;
  job_title: string;
};

const OFFICE_DISPLAY_NAMES: Record<string, string> = {
  denver: "Denver",
  "colorado-springs": "Colorado Springs",
  "grand-junction": "Grand Junction",
  "salt-lake-city": "Salt Lake City",
};

/** Canonical apply links when API is unavailable (SSR or outage). */
export function staticOperationsOpenings(): Opening[] {
  return OPERATIONS_OFFICE_ORDER.map((slug) => ({
    office_slug: slug,
    office_name: OFFICE_DISPLAY_NAMES[slug] ?? slug,
    job_slug: OPERATIONS_JOB_SLUG,
    job_title: "Moving Operations Crew",
  }));
}

/** One listing per office; prefer moving-operations-crew when multiple jobs exist. */
export function consolidateOpeningsPerOffice(openings: Opening[]): Opening[] {
  const byOffice = new Map<string, Opening>();
  for (const o of openings) {
    const existing = byOffice.get(o.office_slug);
    if (!existing) {
      byOffice.set(o.office_slug, o);
      continue;
    }
    if (o.job_slug === OPERATIONS_JOB_SLUG) {
      byOffice.set(o.office_slug, o);
    } else if (existing.job_slug !== OPERATIONS_JOB_SLUG) {
      byOffice.set(o.office_slug, o);
    }
  }
  return [...byOffice.values()];
}

/** Operations listing cards always link to the consolidated operations slug. */
export function openingsForOperationsDisplay(openings: Opening[]): Opening[] {
  const consolidated = consolidateOpeningsPerOffice(openings);
  if (!consolidated.length) return staticOperationsOpenings();
  return consolidated.map((o) => ({
    ...o,
    job_slug: OPERATIONS_JOB_SLUG,
    job_title: o.job_title || "Moving Operations Crew",
  }));
}

export function groupOpeningsByOffice(openings: Opening[]): Array<{
  slug: string;
  name: string;
  jobs: Opening[];
}> {
  const display = openingsForOperationsDisplay(openings);
  const bySlug = new Map<string, { slug: string; name: string; jobs: Opening[] }>();
  for (const o of display) {
    let group = bySlug.get(o.office_slug);
    if (!group) {
      group = { slug: o.office_slug, name: o.office_name, jobs: [] };
      bySlug.set(o.office_slug, group);
    }
    group.jobs.push(o);
  }

  const ordered: Array<{ slug: string; name: string; jobs: Opening[] }> = [];
  for (const slug of OPERATIONS_OFFICE_ORDER) {
    const g = bySlug.get(slug);
    if (g) ordered.push(g);
  }
  for (const g of bySlug.values()) {
    if (!(OPERATIONS_OFFICE_ORDER as readonly string[]).includes(g.slug)) {
      ordered.push(g);
    }
  }
  return ordered;
}

export async function fetchOpeningsFromApi(apiBase: string): Promise<Opening[]> {
  if (!apiBase) return [];
  try {
    const res = await fetch(`${apiBase}/public/openings`);
    if (!res.ok) return [];
    const data = (await res.json()) as { openings?: Opening[] };
    return data.openings ?? [];
  } catch {
    return [];
  }
}

export function officeDisplayName(officeSlug: string): string {
  return OFFICE_DISPLAY_NAMES[officeSlug] ?? officeSlug;
}
