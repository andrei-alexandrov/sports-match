import { describe, expect, it } from "vitest";
import { formatEventDate } from "./formatEventDate";

describe("formatEventDate", () => {
  it("formats an ISO timestamp as weekday, date and time", () => {
    const iso = new Date(2026, 6, 11, 10, 30).toISOString(); // local Sat 11 Jul 2026 10:30
    expect(formatEventDate(iso)).toBe("Sat, 11 Jul · 10:30");
  });
});
