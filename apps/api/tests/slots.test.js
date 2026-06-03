import { generateSlots } from "../dist/src/lib/slots.js";

describe("generateSlots", () => {
  it("returns non-overlapping future slots", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const slots = generateSlots(from, to, rules, [], [], 30, 0, "America/Denver");
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty("startsAt");
    expect(slots[0]).toHaveProperty("labelTime");
    expect(slots[0]).toHaveProperty("localDate");
  });

  it("interprets rule times in office timezone", () => {
    const rules = [{ dayOfWeek: 3, startTime: "10:00", endTime: "11:00" }];
    const from = "2030-01-09";
    const to = "2030-01-09";
    const slots = generateSlots(from, to, rules, [], [], 30, 15, "America/Denver");
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].labelTime).toMatch(/10:00 AM/);
    expect(slots[0].localDate).toBe("2030-01-09");
  });

  it("excludes booked intervals", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "11:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const slotsUtc = generateSlots(from, to, rules, [], [], 30, 0, "UTC");
    const firstStart = slotsUtc[0]?.startsAt;
    expect(firstStart).toBeTruthy();
    const booked = [
      {
        startsAt: new Date(firstStart),
        endsAt: new Date(new Date(firstStart).getTime() + 30 * 60 * 1000),
      },
    ];
    const slots = generateSlots(from, to, rules, [], booked, 30, 0, "UTC");
    const hasSame = slots.some((s) => s.startsAt === firstStart);
    expect(hasSame).toBe(false);
  });
});
