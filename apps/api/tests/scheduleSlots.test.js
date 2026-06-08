import { findMatchingSlot } from "../dist/src/lib/scheduleSlots.js";

describe("findMatchingSlot", () => {
  const slots = [
    {
      startsAt: "2030-01-15T17:00:00.000Z",
      endsAt: "2030-01-15T17:30:00.000Z",
    },
    {
      startsAt: "2030-01-15T17:30:00.000Z",
      endsAt: "2030-01-15T18:00:00.000Z",
    },
  ];

  it("matches an available slot by start time", () => {
    const match = findMatchingSlot(slots, new Date("2030-01-15T17:30:00.000Z"));
    expect(match?.startsAt).toBe("2030-01-15T17:30:00.000Z");
  });

  it("returns undefined when the slot is not offered", () => {
    const match = findMatchingSlot(slots, new Date("2030-01-15T18:30:00.000Z"));
    expect(match).toBeUndefined();
  });
});

describe("reminder schedule shift", () => {
  it("computes reminder time from interview start and offset", () => {
    const startsAt = new Date("2030-06-15T18:00:00.000Z");
    const hoursBefore = 24;
    const scheduledFor = new Date(startsAt.getTime() - hoursBefore * 60 * 60 * 1000);
    expect(scheduledFor.toISOString()).toBe("2030-06-14T18:00:00.000Z");
  });
});
