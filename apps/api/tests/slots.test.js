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

  it("spaces consecutive slots by duration only, not buffer", () => {
    const rules = [{ dayOfWeek: 3, startTime: "10:00", endTime: "12:00" }];
    const from = "2030-01-09";
    const to = "2030-01-09";
    const slots = generateSlots(from, to, rules, [], [], 30, 15, "America/Denver");
    expect(slots.length).toBeGreaterThan(1);
    const t0 = new Date(slots[0].startsAt).getTime();
    const t1 = new Date(slots[1].startsAt).getTime();
    expect(t1 - t0).toBe(30 * 60 * 1000);
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

  it("excludes booked intervals when capacity is 1", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "11:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const slotsUtc = generateSlots(from, to, rules, [], [], 30, 0, "UTC", 1);
    const firstStart = slotsUtc[0]?.startsAt;
    expect(firstStart).toBeTruthy();
    const booked = [
      {
        startsAt: new Date(firstStart),
        endsAt: new Date(new Date(firstStart).getTime() + 30 * 60 * 1000),
      },
    ];
    const slots = generateSlots(from, to, rules, [], booked, 30, 0, "UTC", 1);
    const hasSame = slots.some((s) => s.startsAt === firstStart);
    expect(hasSame).toBe(false);
  });

  it("allows a second booking at the same time when capacity is 2", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "11:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const slotsUtc = generateSlots(from, to, rules, [], [], 30, 0, "UTC", 2);
    const firstStart = slotsUtc[0]?.startsAt;
    const booked = [
      {
        startsAt: new Date(firstStart),
        endsAt: new Date(new Date(firstStart).getTime() + 30 * 60 * 1000),
      },
    ];
    const slots = generateSlots(from, to, rules, [], booked, 30, 0, "UTC", 2);
    expect(slots.some((s) => s.startsAt === firstStart)).toBe(true);

    booked.push({
      startsAt: new Date(firstStart),
      endsAt: new Date(new Date(firstStart).getTime() + 30 * 60 * 1000),
    });
    const full = generateSlots(from, to, rules, [], booked, 30, 0, "UTC", 2);
    expect(full.some((s) => s.startsAt === firstStart)).toBe(false);
  });

  it("skips slots on exception dates", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const slots = generateSlots(from, to, rules, ["2030-01-06"], [], 30, 0, "UTC");
    expect(slots.length).toBe(0);
  });

  it("skips slots overlapping blocked intervals", () => {
    const rules = [{ dayOfWeek: 0, startTime: "09:00", endTime: "12:00" }];
    const from = "2030-01-06";
    const to = "2030-01-06";
    const all = generateSlots(from, to, rules, [], [], 30, 0, "UTC");
    expect(all.length).toBeGreaterThan(0);
    const target = all[0];
    const blocked = [
      {
        startsAt: new Date(target.startsAt),
        endsAt: new Date(target.endsAt),
      },
    ];
    const filtered = generateSlots(from, to, rules, [], [], 30, 0, "UTC", 1, blocked);
    expect(filtered.some((s) => s.startsAt === target.startsAt)).toBe(false);
  });
});
