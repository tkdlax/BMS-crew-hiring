import {
  timeRangesOverlap,
  endAfterStart,
  normalizeTimeHM,
  formatTime12h,
} from "@bms/shared";

describe("availability time helpers", () => {
  it("normalizes HH:MM from longer strings", () => {
    expect(normalizeTimeHM("10:00:00")).toBe("10:00");
    expect(normalizeTimeHM("9:05")).toBe("09:05");
  });

  it("detects end after start", () => {
    expect(endAfterStart("10:00", "16:00")).toBe(true);
    expect(endAfterStart("16:00", "10:00")).toBe(false);
    expect(endAfterStart("10:00", "10:00")).toBe(false);
  });

  it("allows touching ranges without overlap", () => {
    expect(timeRangesOverlap("10:00", "12:00", "12:00", "14:00")).toBe(false);
    expect(timeRangesOverlap("10:00", "12:00", "11:00", "13:00")).toBe(true);
  });

  it("formats 12-hour times", () => {
    expect(formatTime12h("10:00")).toBe("10:00 AM");
    expect(formatTime12h("14:30")).toBe("2:30 PM");
  });
});
