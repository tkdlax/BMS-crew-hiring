export type ScheduleConfirmationDetails = {
  firstName: string;
  lastName?: string;
  jobTitle: string;
  officeName: string;
  officeLocation: string;
  locationNotes?: string | null;
  interviewTimeLocal: string;
  primaryInterest?: string;
  startsAt: string;
  endsAt: string;
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

export function populateConfirmationDetails(
  container: HTMLElement,
  data: ScheduleConfirmationDetails
): void {
  const rows: { label: string; value: string; multiline?: boolean }[] = [
    { label: "Role", value: data.jobTitle },
    { label: "When", value: data.interviewTimeLocal },
    { label: "Office", value: data.officeName },
    { label: "Location", value: data.officeLocation },
  ];
  if (data.primaryInterest?.trim()) {
    rows.splice(1, 0, { label: "Interest", value: data.primaryInterest.trim() });
  }
  const notes = data.locationNotes?.trim();
  if (notes) {
    rows.push({ label: "Arrival instructions", value: notes, multiline: true });
  }

  container.innerHTML = rows
    .map(
      (row) =>
        `<div class="schedule-confirmation-details__row${row.multiline ? " schedule-confirmation-details__row--multiline" : ""}"><dt>${escHtml(row.label)}</dt><dd>${escHtml(row.value)}</dd></div>`
    )
    .join("");
  container.hidden = false;
}

export function wireCalendarDownload(
  button: HTMLButtonElement | null,
  data: ScheduleConfirmationDetails
): void {
  if (!button) return;
  button.hidden = false;
  button.onclick = () => downloadInterviewCalendarInvite(data);
}

export function renderScheduleConfirmation(
  rootId: string,
  data: ScheduleConfirmationDetails
): void {
  const root = document.getElementById(rootId);
  if (!root) return;

  const title = root.querySelector(".schedule-success__title");
  const intro = root.querySelector(".schedule-success__intro");
  const details = root.querySelector(".schedule-confirmation-details") as HTMLElement | null;
  const foot = root.querySelector(".schedule-success__foot");
  const calendarBtn = root.querySelector(".schedule-success__calendar") as HTMLButtonElement | null;

  const name = data.firstName.trim();
  if (title) {
    title.textContent = name ? `You're all set, ${name}!` : "You're all set!";
  }
  if (intro) {
    intro.textContent =
      "Your in-person interview is confirmed. Details are below — we also sent them by email and text.";
  }

  if (details) populateConfirmationDetails(details, data);

  if (foot) {
    foot.textContent =
      "Need to reschedule? Use the link in your confirmation email or call 888-260-5717.";
  }

  wireCalendarDownload(calendarBtn, data);
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildInterviewCalendarInvite(data: ScheduleConfirmationDetails): string {
  const uid = `bms-interview-${Date.now()}@baileysallied.com`;
  const descriptionParts = [
    `Interview for ${data.jobTitle} at ${data.officeName}.`,
    data.primaryInterest?.trim() ? `Interest: ${data.primaryInterest.trim()}` : "",
    data.locationNotes?.trim() ? `Arrival: ${data.locationNotes.trim()}` : "",
  ].filter(Boolean);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baileys Moving and Storage//Hiring//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(data.startsAt)}`,
    `DTEND:${toIcsUtc(data.endsAt)}`,
    `SUMMARY:${icsEscape(`Interview — ${data.jobTitle}`)}`,
    `LOCATION:${icsEscape(data.officeLocation)}`,
    `DESCRIPTION:${icsEscape(descriptionParts.join("\n\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadInterviewCalendarInvite(data: ScheduleConfirmationDetails): void {
  const ics = buildInterviewCalendarInvite(data);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "baileys-interview.ics";
  link.click();
  URL.revokeObjectURL(url);
}

export const PREVIEW_CONFIRMATION: ScheduleConfirmationDetails = {
  firstName: "Alex",
  lastName: "Applicant",
  jobTitle: "Moving Operations Crew",
  officeName: "Denver",
  officeLocation: "11755 E Peakview Ave, Centennial, CO 80111",
  locationNotes: "Enter through the side door and ask for Sarah at the front desk.",
  interviewTimeLocal: "Wednesday, January 15, 2030 at 10:00 AM MST",
  primaryInterest: "Mover & Packer",
  startsAt: "2030-01-15T17:00:00.000Z",
  endsAt: "2030-01-15T17:30:00.000Z",
};
