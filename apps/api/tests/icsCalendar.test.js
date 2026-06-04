import { buildOfficeCalendarFeed } from "../dist/src/lib/icsCalendar.js";

describe("buildOfficeCalendarFeed", () => {
  it("builds valid ICS with event summary", () => {
    const ics = buildOfficeCalendarFeed([
      {
        id: 42,
        startsAt: "2030-06-15T16:00:00.000Z",
        endsAt: "2030-06-15T16:30:00.000Z",
        firstName: "Jane",
        lastName: "Doe",
        primaryInterest: "Driver",
        jobTitle: "Moving Operations Crew",
        status: "scheduled",
        applicationId: 1,
        officeName: "Denver",
        officeLocation: "Centennial, CO",
      },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("Jane Doe");
    expect(ics).toContain("Driver");
    expect(ics).toContain("UID:bms-booking-42@baileysallied.com");
    expect(ics).not.toContain("@example.com");
  });
});
