/** Build subscribe URL for per-office ICS feed (same-origin hire proxy). */
export function buildCalendarFeedUrl(officeSlug: string, feedToken: string): string {
  const base = import.meta.env.BASE_URL || "/hiring/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  const path = `${withSlash}api/hire/public/calendar/${officeSlug}/${feedToken}.ics`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function buildWebcalFeedUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https:/i, "webcal:");
}
