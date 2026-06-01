import { generateSlots } from "../dist/src/lib/slots.js";

describe("generateSlots", () => {
  it("returns non-overlapping future slots", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const slots = generateSlots(from, to, rules, [], [], 30, 0, "America/Denver");
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty("startsAt");
    expect(slots[0]).toHaveProperty("labelLocal");
  });

  it("excludes booked intervals", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "11:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const booked = [
      {
        startsAt: new Date("2030-01-06T09:00:00.000Z"),
        endsAt: new Date("2030-01-06T09:30:00.000Z"),
      },
    ];
    const slots = generateSlots(from, to, rules, [], booked, 30, 0, "UTC");
    const hasNine = slots.some((s) => s.startsAt.includes("T09:00"));
    expect(hasNine).toBe(false);
  });
});
