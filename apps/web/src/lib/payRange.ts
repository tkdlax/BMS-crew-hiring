export function formatPayAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

/** Hero band compensation line (e.g. "$17–$25/hr + CASH tips"). */
export function formatHeroCompensation(min: number, max: number): string {
  return `$${formatPayAmount(min)}–$${formatPayAmount(max)}/hr + CASH tips`;
}

/** Job details card pay line (e.g. "Full-time or Seasonal | $17-25/hr (DOE)"). */
export function formatDetailsCompensation(min: number, max: number): string {
  return `Full-time or Seasonal | $${formatPayAmount(min)}-${formatPayAmount(max)}/hr (DOE)`;
}
