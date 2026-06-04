import type { CalendarEventRow } from "./calendarEvents.js";

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export type IcsFeedEvent = CalendarEventRow & {
  officeName: string;
  officeLocation: string;
  locationNotes?: string;
};

export function buildOfficeCalendarFeed(events: IcsFeedEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baileys Moving and Storage//Hiring//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Bailey's Operations Interviews",
  ];

  const now = toIcsUtc(new Date().toISOString());

  for (const ev of events) {
    const interest = ev.primaryInterest?.trim() || "Not specified";
    const summary = `Interview — ${ev.firstName} ${ev.lastName} (${interest})`;
    const descriptionParts = [
      `Role: ${ev.jobTitle}`,
      `Interest: ${interest}`,
      `Office: ${ev.officeName}`,
      ev.officeLocation ? `Location: ${ev.officeLocation}` : "",
      ev.locationNotes?.trim() ? `Arrival: ${ev.locationNotes.trim()}` : "",
    ].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:bms-booking-${ev.id}@baileysallied.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsUtc(ev.startsAt)}`,
      `DTEND:${toIcsUtc(ev.endsAt)}`,
      `SUMMARY:${icsEscape(summary)}`,
      `LOCATION:${icsEscape(ev.officeLocation || ev.officeName)}`,
      `DESCRIPTION:${icsEscape(descriptionParts.join("\\n"))}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
