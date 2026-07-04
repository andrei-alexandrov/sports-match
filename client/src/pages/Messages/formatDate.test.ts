import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("shows only the time for a message from today", () => {
    const today = new Date();
    today.setHours(14, 5, 0, 0);
    expect(formatDate(today)).toBe(
      today.toLocaleString("bg-BG", { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  });

  it("prefixes the date for a message from another day", () => {
    const other = new Date("2026-01-15T09:30:00");
    const result = formatDate(other);
    expect(result).toContain("Jan 15, 2026");
    expect(result).toContain(
      other.toLocaleString("bg-BG", { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  });
});
